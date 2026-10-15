#!/usr/bin/env node
// A deliberately vulnerable demo app, for reproducing validra-check results
// without touching anyone's real site. It runs entirely on your machine and
// imitates the parts of a Supabase project the tool talks to:
//
//   GET /                      HTML page loading /app.js
//   GET /app.js                "bundle" with the Supabase URL, the public anon
//                              key, and a leaked secret key (fake)
//   GET /rest/v1/              table list (like PostgREST's OpenAPI root)
//   GET /rest/v1/<table>       table rows
//   GET /storage/v1/bucket     storage buckets
//
// This is a simulation, not a real Supabase or PostgREST server: it only
// implements the GET requests above, and it ignores the key it receives.
// All data is fake. See demo/EXPECTED.md for the results you should get.
//
//   npm run demo            then, in another terminal:
//   npx validra-check http://127.0.0.1:54321

import http from "node:http";

// 54321 is the default port of a local Supabase stack, which is what
// validra-check recognizes as a local project.
export const DEMO_PORT = 54321;
const BASE = `http://127.0.0.1:${DEMO_PORT}`;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
// Same shape as the anon key `supabase start` prints (issuer "supabase-demo").
// The signature is fake; nothing checks it here.
const ANON_KEY = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ iss: "supabase-demo", role: "anon" })}.ZmFrZS1zaWduYXR1cmUtZm9yLWRlbW8`;
// Assembled at runtime so no secret-looking literal sits in the repository.
const FAKE_STRIPE_SECRET = ["sk", "live", "DEMO0000fake0000key0000notreal"].join("_");

const TABLES = {
  // RLS missing: anyone can read it. Contains personal-looking (fake) data.
  profiles: [{ id: 1, email: "alice@example.com", full_name: "Alice Example", plan: "pro" }],
  // RLS on: anonymous requests get no rows.
  orders: [],
  // Intentionally public catalog: readable by design. The tool still reports
  // it, which is the "intentionally public table" false positive documented
  // in docs/METHODOLOGY.md.
  products: [{ id: 1, name: "Starter plan", price_eur: 9 }],
};

const BUCKETS = [
  { id: "avatars", name: "avatars", public: true },
  { id: "invoices", name: "invoices", public: false },
];

const PAGE = `<!doctype html>
<html><head><title>Demo app (deliberately vulnerable)</title></head>
<body>
<h1>validra-check demo app</h1>
<p>Deliberately vulnerable. Local only. Fake data.</p>
<script src="/app.js"></script>
</body></html>`;

const BUNDLE = `// Simulated client bundle
const supabase = createClient("${BASE}", "${ANON_KEY}");
// Mistake on purpose: a server-side secret shipped to the browser.
const stripe = new Stripe("${FAKE_STRIPE_SECRET}");
`;

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "content-type": type });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

export function createDemoServer() {
  return http.createServer((req, res) => {
    if (req.method !== "GET") return send(res, 405, { message: "Demo only answers GET" });
    const { pathname } = new URL(req.url, BASE);

    if (pathname === "/") return send(res, 200, PAGE, "text/html");
    if (pathname === "/app.js") return send(res, 200, BUNDLE, "text/javascript");
    if (pathname === "/rest/v1/") {
      const paths = Object.fromEntries(Object.keys(TABLES).map((t) => [`/${t}`, {}]));
      return send(res, 200, { paths });
    }
    if (pathname.startsWith("/rest/v1/")) {
      const table = decodeURIComponent(pathname.slice("/rest/v1/".length));
      if (!(table in TABLES)) return send(res, 404, { code: "PGRST205", message: "Table not found" });
      return send(res, 200, TABLES[table].slice(0, 1));
    }
    if (pathname === "/storage/v1/bucket") return send(res, 200, BUCKETS);
    return send(res, 404, { message: "Not found" });
  });
}

// Run directly: `node demo/server.js`
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("demo/server.js")) {
  createDemoServer().listen(DEMO_PORT, "127.0.0.1", () => {
    console.log(`Demo app running at ${BASE}`);
    console.log(`In another terminal: npx validra-check ${BASE}`);
  });
}
