import { test } from "node:test";
import assert from "node:assert/strict";
import { createDemoServer, DEMO_PORT } from "../demo/server.js";
import { scan } from "../src/scan.js";

// End-to-end against the local demo app (real HTTP, no mocks). Keep in sync
// with demo/EXPECTED.md.
test("demo app produces exactly the documented findings", async (t) => {
  const server = createDemoServer();
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(DEMO_PORT, "127.0.0.1", resolve);
    });
  } catch (err) {
    if (err.code === "EADDRINUSE") return t.skip(`port ${DEMO_PORT} is busy (local Supabase running?)`);
    throw err;
  }
  try {
    const r = await scan(`http://127.0.0.1:${DEMO_PORT}/`);
    const got = r.findings.map((f) => `${f.severity}|${f.confidence}|${f.title}`);
    assert.deepEqual(got, [
      "critical|weakness|Stripe secret key exposed in client code",
      'critical|demonstrated|Table "profiles" is readable without logging in',
      'high|demonstrated|Table "products" is readable without logging in',
      'medium|weakness|Storage bucket "avatars" is public',
      "info|observation|Database table list is public",
    ]);
    assert.equal(r.supabase[0].ref, "local");
    assert.equal(r.supabase[0].checked.find((c) => c.table === "orders").status, "empty-or-filtered");
    assert.ok(!JSON.stringify(r).includes("alice@example.com"), "row values must never appear in the result");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
