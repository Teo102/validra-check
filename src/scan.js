import { SECRET_PATTERNS, SENSITIVE_COLUMN_HINTS, COMMON_TABLES, redact } from "./patterns.js";

const UA = "validra-check (+https://validra.dev)";
const TIMEOUT_MS = 10_000;
const MAX_SCRIPTS = 40;
const MAX_SCRIPT_BYTES = 5_000_000;
const MAX_TABLES = 60;

const SUPABASE_URL_RE = /https:\/\/([a-z0-9]{20})\.supabase\.co/g;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const PUBLISHABLE_RE = /\bsb_publishable_[A-Za-z0-9_-]{20,}/g;

function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(part, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

// Pure: looks at downloaded text only, no network.
export function analyzeText(text) {
  const findings = [];
  const supabaseRefs = new Set();
  const publicKeys = new Set();

  for (const m of text.matchAll(SUPABASE_URL_RE)) supabaseRefs.add(m[1]);
  for (const m of text.matchAll(PUBLISHABLE_RE)) publicKeys.add(m[0]);

  for (const m of text.matchAll(JWT_RE)) {
    const payload = decodeJwtPayload(m[0]);
    if (!payload || payload.iss !== "supabase") continue;
    if (payload.ref) supabaseRefs.add(payload.ref);
    if (payload.role === "service_role") {
      findings.push({
        severity: "critical",
        title: "Supabase service_role key shipped to the browser",
        detail: `${redact(m[0])} — bypasses Row-Level Security entirely: full read/write access to the database.`,
      });
    } else if (payload.role === "anon") {
      publicKeys.add(m[0]);
    }
  }

  const seen = new Set();
  for (const p of SECRET_PATTERNS) {
    for (const m of text.matchAll(p.regex)) {
      if (seen.has(m[0])) continue;
      seen.add(m[0]);
      findings.push({ severity: p.severity, title: `${p.name} exposed in client code`, detail: `${redact(m[0])} — ${p.why}` });
    }
  }

  return { findings, supabaseRefs: [...supabaseRefs], publicKeys: [...publicKeys] };
}

async function get(url, fetchImpl, headers = {}) {
  return fetchImpl(url, {
    headers: { "user-agent": UA, ...headers },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

// Downloads the page and the same-origin scripts it loads.
export async function collectClientCode(pageUrl, fetchImpl = fetch) {
  const res = await get(pageUrl, fetchImpl);
  if (!res.ok) throw new Error(`Could not load ${pageUrl} (HTTP ${res.status})`);
  const finalUrl = res.url || pageUrl;
  const html = await res.text();
  const origin = new URL(finalUrl).origin;

  const srcs = new Set();
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) srcs.add(m[1]);
  for (const m of html.matchAll(/<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+)["']/gi)) srcs.add(m[1]);

  const scripts = [];
  for (const src of [...srcs].slice(0, MAX_SCRIPTS)) {
    let abs;
    try {
      abs = new URL(src, finalUrl);
    } catch {
      continue;
    }
    if (abs.origin !== origin) continue;
    try {
      const r = await get(abs.href, fetchImpl);
      if (!r.ok) continue;
      const body = await r.text();
      if (body.length <= MAX_SCRIPT_BYTES) scripts.push(body);
    } catch {
      // A failing chunk shouldn't stop the scan.
    }
  }
  return { finalUrl, text: [html, ...scripts].join("\n"), scriptCount: scripts.length };
}

function authHeaders(key) {
  // Legacy anon keys are JWTs and go in both headers; new publishable keys
  // only go in `apikey`.
  return key.startsWith("eyJ") ? { apikey: key, authorization: `Bearer ${key}` } : { apikey: key };
}

// Queries the database exactly like an anonymous visitor could, reading at
// most one row per table. Row values are never returned, only column names.
export async function probeSupabase({ ref, key, baseUrl, extraTables = [], fetchImpl = fetch }) {
  const base = baseUrl ?? `https://${ref}.supabase.co`;
  const headers = authHeaders(key);
  const findings = [];
  const tables = new Set(extraTables);
  let schemaPublic = false;

  try {
    const r = await get(`${base}/rest/v1/`, fetchImpl, headers);
    if (r.ok) {
      const spec = await r.json();
      const paths = Object.keys(spec.paths ?? {}).map((p) => p.replace(/^\//, "")).filter((p) => p && !p.startsWith("rpc/"));
      if (paths.length) {
        schemaPublic = true;
        paths.forEach((p) => tables.add(p));
      }
    }
  } catch {
    // Schema not published: fall back to common names below.
  }
  if (!schemaPublic) COMMON_TABLES.forEach((t) => tables.add(t));

  if (schemaPublic) {
    findings.push({
      severity: "info",
      title: "Database table list is public",
      detail: `Anyone can list your ${tables.size} tables. Not a leak by itself, but it maps your data model for an attacker.`,
    });
  }

  const checked = [];
  for (const table of [...tables].slice(0, MAX_TABLES)) {
    let r;
    try {
      r = await get(`${base}/rest/v1/${encodeURIComponent(table)}?select=*&limit=1`, fetchImpl, headers);
    } catch {
      continue;
    }
    if (!r.ok) {
      if (schemaPublic) checked.push({ table, status: "protected" });
      continue;
    }
    let rows;
    try {
      rows = await r.json();
    } catch {
      continue;
    }
    if (!Array.isArray(rows)) continue;
    if (rows.length === 0) {
      checked.push({ table, status: "empty-or-filtered" });
      continue;
    }
    const columns = Object.keys(rows[0]);
    const sensitive = columns.filter((c) => SENSITIVE_COLUMN_HINTS.some((h) => c.toLowerCase().includes(h)));
    checked.push({ table, status: "exposed", columns, sensitive });
    findings.push({
      severity: sensitive.length ? "critical" : "high",
      title: `Table "${table}" is readable without logging in`,
      detail: sensitive.length
        ? `Columns include ${sensitive.join(", ")}. Check its Row-Level Security policies.`
        : `Columns: ${columns.slice(0, 8).join(", ")}${columns.length > 8 ? ", …" : ""}. Check its Row-Level Security policies.`,
    });
  }

  try {
    const r = await get(`${base}/storage/v1/bucket`, fetchImpl, headers);
    if (r.ok) {
      const buckets = await r.json();
      const pub = Array.isArray(buckets) ? buckets.filter((b) => b.public) : [];
      for (const b of pub) {
        findings.push({
          severity: "medium",
          title: `Storage bucket "${b.name}" is public`,
          detail: "Every file in it can be downloaded by anyone with the URL. Fine for logos, not for invoices or IDs.",
        });
      }
    }
  } catch {
    // Storage not reachable anonymously: nothing to report.
  }

  return { findings, checked, schemaPublic };
}

export async function scan(pageUrl, { extraTables = [], fetchImpl = fetch } = {}) {
  const client = await collectClientCode(pageUrl, fetchImpl);
  const analysis = analyzeText(client.text);
  const findings = [...analysis.findings];
  const supabase = [];

  for (const ref of analysis.supabaseRefs) {
    const key = analysis.publicKeys[0];
    if (!key) {
      supabase.push({ ref, skipped: "No public Supabase key found in the client code." });
      continue;
    }
    const probe = await probeSupabase({ ref, key, extraTables, fetchImpl });
    findings.push(...probe.findings);
    supabase.push({ ref, checked: probe.checked, schemaPublic: probe.schemaPublic });
  }

  const order = { critical: 0, high: 1, medium: 2, info: 3 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);
  return { url: client.finalUrl, scriptCount: client.scriptCount, supabase, findings };
}
