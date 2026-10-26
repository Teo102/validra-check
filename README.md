# validra-check

[![tests](https://github.com/Teo102/validra-check/actions/workflows/test.yml/badge.svg)](https://github.com/Teo102/validra-check/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/validra-check)](https://www.npmjs.com/package/validra-check)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Find what your web app exposes to anyone, in about a minute.

```bash
npx validra-check https://your-app.com
```

No install, no account, no dependencies.

## What it checks

It looks at your app exactly like an anonymous visitor would:

1. **Leaked secrets in client code.** It downloads your page and the JavaScript it loads, and looks for keys that should never reach a browser: Supabase `service_role` / `sb_secret_` keys, Stripe secret keys, OpenAI and Anthropic keys, GitHub tokens, AWS keys, Resend keys.
2. **Supabase tables readable without logging in.** If it finds a Supabase project and its public key in your code (normal for Supabase apps), it checks which tables return data to someone who isn't logged in. This is the most common way apps built with Lovable, Bolt, Cursor, or v0 leak user data: Row-Level Security is missing or too permissive.
3. **Public storage buckets.** Buckets whose files anyone can download.

Example output:

```
✖ 2 issue(s) found

  CRITICAL  Table "profiles" is readable without logging in
  Columns include email, full_name. Check its Row-Level Security policies.

  MEDIUM  Storage bucket "documents" is public
  Every file in it can be downloaded by anyone with the URL.
```

## What it does not check

This is a quick, outside-in check. It does not test what a **logged-in** user can see of other users' data (IDOR, cross-tenant leaks), server actions, webhook handlers, or your business logic. Those are often where the serious issues are, and they need someone who understands how your product is supposed to work.

A clean result is a good sign, not a guarantee.

## Safe by design

- **Read-only.** It only sends `GET` requests, the same ones any visitor's browser could send.
- **Minimal.** At most one row per table, only to see whether data comes back.
- **No data shown.** Row values are never printed or stored; only table and column names.
- **No telemetry.** Nothing is sent anywhere except to the app you scan.

Every finding is rated by **severity** (how bad it would be) and **confidence** (`demonstrated`, `weakness`, or `observation`: how much the tool actually proved). The full method, known false positives, and limits are in [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

## Responsible use

Run validra-check **only on applications you own, or that you have written permission to test.**

Even though the tool only does what a browser does, accessing data in a system without authorization can be illegal (for example under article 323-1 of the French Penal Code, or the Computer Fraud and Abuse Act in the US), and it is not okay regardless of the law.

- Do not use it to scan other people's apps "to show them a problem". Ask first, in writing.
- If you find a real issue in an app you are authorized to test, report it privately to its owner and give them time to fix it before mentioning it anywhere.
- Do not publish results that identify an application or its data.

The tool will stay read-only. Pull requests that add writing, exploitation, data extraction, or authentication bypass will not be accepted.

Found a problem in the tool itself? See [SECURITY.md](SECURITY.md).

## Try it without scanning anyone

The repository includes a deliberately vulnerable demo app that runs only on your machine, with fake data:

```bash
git clone https://github.com/Teo102/validra-check && cd validra-check
npm run demo                                   # terminal 1
node bin/validra-check.js http://127.0.0.1:54321   # terminal 2
```

The expected results, and what the demo does and doesn't imitate, are in [demo/EXPECTED.md](demo/EXPECTED.md). A test checks that exact output on every push.

## Options

```
--tables a,b,c   Also test these table names
--json           Print the result as JSON
```

Exit code is `2` when a critical or high issue is found, so you can run it in CI:

```bash
npx validra-check https://staging.your-app.com || exit 1
```

## How to fix what it finds

- The [free guide of 25 common vulnerabilities in AI-built apps](https://validra.dev/en/guide), with how to test and fix each one.
- [SaaS Security Questionnaire Guide (VSAQ, CAIQ, Due Diligence)](docs/articles/saas-security-questionnaire-guide.md)
- [B2B Security Questionnaire Master Answers (7 Pillars)](templates/B2B_SECURITY_QUESTIONNAIRE_ANSWERS.md)
- [Official Signed Letter of Attestation Template](templates/LETTER_OF_ATTESTATION_TEMPLATE.md)
- [Supabase RLS Data Exposure Technical Guide](docs/articles/supabase-rls-misconfigured.md)
- For a full human review of your app, including what logged-in users can access: [Validra Security Review](https://validra.dev/en/pricing) — €395 to start, €790 max, only if we find something relevant.

---

## En français

Vérifiez en une minute ce que votre application expose à n'importe qui :

```bash
npx validra-check https://votre-app.com
```

L'outil cherche les clés secrètes présentes dans le code envoyé au navigateur, les tables Supabase lisibles sans être connecté, et les buckets de stockage publics. Il ne fait que des lectures, lit au maximum une ligne par table et n'affiche jamais les données. Il ne teste pas ce qu'un utilisateur connecté peut voir des données des autres : pour ça, il faut une revue humaine ([Validra](https://validra.dev/fr/pricing), dès 395 €).

N'analysez que des applications qui vous appartiennent ou que vous êtes autorisé à tester.

## License

MIT — made by [Téo Brondel](https://validra.dev/en/teo-brondel) at [Validra](https://validra.dev).
