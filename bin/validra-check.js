#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { scan } from "../src/scan.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const args = process.argv.slice(2);

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = c(1), dim = c(2), red = c(31), yellow = c(33), green = c(32), cyan = c(36);
const SEVERITY_STYLE = { critical: red, high: red, medium: yellow, info: dim };

const HELP = `
${bold("validra-check")} — find what your web app exposes to anyone, in about a minute.

Usage:
  npx validra-check <url> [options]

Options:
  --tables a,b,c   Also test these table names
  --json           Print the result as JSON
  -h, --help       Show this help
  -v, --version    Show the version

What it does:
  Downloads your page and its JavaScript like any visitor would, looks for
  leaked secrets, then — if it finds a Supabase project — checks which tables
  can be read without logging in. It reads at most one row per table and never
  prints row values.

Only scan apps you own or are authorized to test.
`;

if (args.includes("-h") || args.includes("--help") || args.length === 0) {
  console.log(HELP);
  process.exit(args.length === 0 ? 1 : 0);
}
if (args.includes("-v") || args.includes("--version")) {
  console.log(pkg.version);
  process.exit(0);
}

const json = args.includes("--json");
const tablesIdx = args.indexOf("--tables");
const extraTables = tablesIdx !== -1 && args[tablesIdx + 1] ? args[tablesIdx + 1].split(",").map((t) => t.trim()).filter(Boolean) : [];
let target = args.find((a, i) => !a.startsWith("-") && (tablesIdx === -1 || i !== tablesIdx + 1));

if (!target) {
  console.error("Please pass the URL of your app, e.g. npx validra-check https://myapp.com");
  process.exit(1);
}
if (!/^https?:\/\//.test(target)) target = `https://${target}`;

if (!json) {
  console.log(`\n${bold("validra-check")} ${dim("v" + pkg.version)}  ${cyan(target)}`);
  console.log(dim("Only scan apps you own or are authorized to test.\n"));
}

try {
  const result = await scan(target, { extraTables });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(dim(`Read the page and ${result.scriptCount} script file(s).`));
    for (const s of result.supabase) {
      if (s.skipped) {
        console.log(dim(`Supabase project ${s.ref}: ${s.skipped}`));
      } else {
        const exposed = s.checked.filter((t) => t.status === "exposed").length;
        console.log(dim(`Supabase project ${s.ref}: tested ${s.checked.length || "common"} table(s), ${exposed} readable without login.`));
      }
    }
    if (result.supabase.length === 0) console.log(dim("No Supabase project detected in the client code."));
    console.log("");

    const real = result.findings.filter((f) => f.severity !== "info");
    if (real.length === 0) {
      console.log(green(bold("✔ Nothing exposed found by this quick check.")));
      console.log(dim("  That's a good sign, not a guarantee: this only covers what an anonymous visitor can reach."));
    } else {
      console.log(red(bold(`✖ ${real.length} issue(s) found`)));
    }
    for (const f of result.findings) {
      const style = SEVERITY_STYLE[f.severity] ?? dim;
      console.log(`\n  ${style(bold(f.severity.toUpperCase()))}  ${bold(f.title)}  ${dim("[" + f.confidence + "]")}`);
      console.log(`  ${dim(f.detail)}`);
    }

    console.log(`\n${dim("What this doesn't check: what logged-in users can see of each other's data (IDOR),")}`);
    console.log(dim("server actions, webhooks, and business logic. That needs a human review."));
    console.log(`\n${dim("Fix guide:")}       https://validra.dev/en/guide`);
    console.log(`${dim("Full review:")}     https://validra.dev/en/pricing ${dim("(from €395)")}\n`);
  }

  process.exit(result.findings.some((f) => f.severity === "critical" || f.severity === "high") ? 2 : 0);
} catch (err) {
  console.error(red(`Scan failed: ${err.message}`));
  process.exit(1);
}
