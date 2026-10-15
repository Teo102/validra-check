import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeText, probeSupabase, scan } from "../src/scan.js";

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (payload) => `eyJhbGciOiJIUzI1NiJ9.${b64(payload)}.c2lnbmF0dXJlLXNpZ25hdHVyZQ`;
const REF = "abcdefghijklmnopqrst";
const ANON = jwt({ iss: "supabase", ref: REF, role: "anon" });
const SERVICE = jwt({ iss: "supabase", ref: REF, role: "service_role" });

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// A fake Supabase: "profiles" leaks rows, "orders" is protected by RLS
// (returns []), "notes" doesn't exist.
function fakeSupabase({ publishSchema }) {
  return async (url) => {
    const u = new URL(url);
    if (u.pathname === "/rest/v1/") {
      return publishSchema ? json({ paths: { "/": {}, "/profiles": {}, "/orders": {}, "/rpc/do_thing": {} } }) : json({ message: "no" }, 401);
    }
    if (u.pathname === "/rest/v1/profiles") return json([{ id: 1, email: "a@b.c", full_name: "A" }]);
    if (u.pathname === "/rest/v1/orders") return json([]);
    if (u.pathname === "/storage/v1/bucket") return json([{ name: "avatars", public: true }, { name: "invoices", public: false }]);
    return json({ code: "PGRST205" }, 404);
  };
}

test("detects the Supabase project and public anon key", () => {
  const r = analyzeText(`const s = createClient("https://${REF}.supabase.co", "${ANON}")`);
  assert.deepEqual(r.supabaseRefs, [REF]);
  assert.deepEqual(r.publicKeys, [ANON]);
  assert.equal(r.findings.length, 0);
});

test("flags a service_role key as critical", () => {
  const r = analyzeText(`key="${SERVICE}"`);
  assert.equal(r.findings[0].severity, "critical");
  assert.match(r.findings[0].title, /service_role/);
});

test("flags leaked secrets and redacts them", () => {
  const stripe = "sk_live_" + "a".repeat(30);
  const r = analyzeText(`x="${stripe}"`);
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].severity, "critical");
  assert.ok(!r.findings[0].detail.includes(stripe), "full secret must never be printed");
});

test("ignores publishable Stripe keys", () => {
  const r = analyzeText(`pk_live_${"a".repeat(30)}`);
  assert.equal(r.findings.length, 0);
});

test("finds readable tables from the published schema, never returns values", async () => {
  const r = await probeSupabase({ ref: REF, key: ANON, baseUrl: "https://db.test", fetchImpl: fakeSupabase({ publishSchema: true }) });
  const profiles = r.checked.find((t) => t.table === "profiles");
  assert.equal(profiles.status, "exposed");
  assert.deepEqual(profiles.sensitive, ["email", "full_name"]);
  assert.equal(r.checked.find((t) => t.table === "orders").status, "empty-or-filtered");
  assert.ok(!JSON.stringify(r).includes("a@b.c"), "row values must never leak into the result");
  assert.ok(r.findings.some((f) => f.severity === "critical" && f.title.includes("profiles")));
  assert.ok(r.findings.some((f) => f.title.includes('"avatars" is public')));
  assert.ok(!r.findings.some((f) => f.title.includes("invoices")));
  assert.ok(!r.checked.some((t) => t.table.startsWith("rpc/")));
});

test("falls back to common table names when the schema is private", async () => {
  const r = await probeSupabase({ ref: REF, key: ANON, baseUrl: "https://db.test", fetchImpl: fakeSupabase({ publishSchema: false }) });
  assert.equal(r.schemaPublic, false);
  assert.ok(r.checked.some((t) => t.table === "profiles" && t.status === "exposed"));
  assert.ok(!r.checked.some((t) => t.table === "notes"), "missing tables are not reported");
});

test("end to end: page -> bundle -> Supabase", async () => {
  const page = `<html><script src="/app.js"></script><script src="https://cdn.other.com/x.js"></script></html>`;
  const bundle = `createClient("https://${REF}.supabase.co","${ANON}")`;
  const db = fakeSupabase({ publishSchema: true });
  const fetchImpl = async (url, init) => {
    const u = new URL(url);
    if (u.host === "myapp.test" && u.pathname === "/") return new Response(page);
    if (u.host === "myapp.test" && u.pathname === "/app.js") return new Response(bundle);
    if (u.host === "cdn.other.com") throw new Error("third-party scripts must not be fetched");
    if (u.host === `${REF}.supabase.co`) return db(url, init);
    return new Response("", { status: 404 });
  };
  const r = await scan("https://myapp.test/", { fetchImpl });
  assert.equal(r.scriptCount, 1);
  assert.equal(r.supabase[0].ref, REF);
  assert.equal(r.findings[0].severity, "critical");
});

test("CLI reads the URL whether or not --tables is passed", async () => {
  const { execFileSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const bin = fileURLToPath(new URL("../bin/validra-check.js", import.meta.url));
  for (const argv of [["notarealhost.invalid"], ["--tables", "a,b", "notarealhost.invalid"], ["notarealhost.invalid", "--tables", "a"]]) {
    let out = "";
    try {
      execFileSync("node", [bin, ...argv], { encoding: "utf8", stdio: "pipe" });
    } catch (e) {
      out = e.stdout + e.stderr;
    }
    assert.match(out, /notarealhost\.invalid/, `args ${argv.join(" ")} should target the host`);
    assert.doesNotMatch(out, /Please pass the URL/);
  }
});

test("every finding has a severity and a confidence level", async () => {
  const levels = ["observation", "weakness", "demonstrated"];
  const text = analyzeText(`k="${SERVICE}" s="sk_live_${"a".repeat(30)}"`);
  const probe = await probeSupabase({ ref: REF, key: ANON, baseUrl: "https://db.test", fetchImpl: fakeSupabase({ publishSchema: true }) });
  const all = [...text.findings, ...probe.findings];
  assert.ok(all.length >= 5);
  for (const f of all) {
    assert.ok(["critical", "high", "medium", "info"].includes(f.severity), f.title);
    assert.ok(levels.includes(f.confidence), `${f.title} -> ${f.confidence}`);
  }
  // Rows actually came back, so the table finding is demonstrated; a key that
  // only matches a format is not.
  assert.equal(probe.findings.find((f) => f.title.includes("profiles")).confidence, "demonstrated");
  assert.equal(text.findings.find((f) => f.title.includes("Stripe")).confidence, "weakness");
});
