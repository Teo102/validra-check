# Methodology

This document describes exactly what validra-check does, how it decides what to report, and where it can be wrong. It describes the code in this repository; if the two ever disagree, the code is right and this document is a bug.

## Principle: look from the outside, change nothing

validra-check behaves like an anonymous visitor's browser. It only uses information the application already gives to anyone who loads it, and it only sends `GET` requests. It never logs in, never writes, never tries to bypass anything, and never calls third-party services to check whether a key works.

This makes it safe to run on your own production app, and it also sets its limits: anything behind a login is invisible to it.

## The checks

### 1. Secrets in client code

**How:** the tool downloads the page and the JavaScript files it references from the same origin (`<script src>` and `<link rel="modulepreload">`), up to 40 files of up to 5 MB each. Scripts on other domains (CDNs, analytics) are not downloaded. It then searches all of that text for known secret formats:

| Secret | Pattern | Severity |
|---|---|---|
| Supabase `service_role` key (legacy JWT) | JWT whose decoded payload has `iss: "supabase"` and `role: "service_role"` | critical |
| Supabase secret key | `sb_secret_…` | critical |
| Stripe secret / restricted key | `sk_live_…`, `rk_live_…` | critical |
| GitHub token | `ghp_`, `gho_`, `ghs_`, `github_pat_` prefixes | critical |
| OpenAI API key | `sk-…`, `sk-proj-…`, `sk-svcacct-…` (40+ characters) | high |
| Anthropic API key | `sk-ant-…` | high |
| AWS access key ID | `AKIA` + 16 characters | high |
| Resend API key | `re_xxxxxxxx_…` | high |

Values are always **redacted** in the output (first 10 and last 4 characters).

**Not reported:** keys designed to be public, such as Supabase anon / publishable keys and Stripe `pk_live_` keys. The Supabase anon key is used for the next check.

### 2. Supabase tables readable without logging in

**When:** only if the client code contains both a Supabase project URL (`https://<ref>.supabase.co`) and a public key (anon JWT or `sb_publishable_…`). This is normal for any Supabase app; the public key is meant to be in the browser, and Row-Level Security is what protects the data.

**How:**

1. It requests the PostgREST root (`/rest/v1/`) with the public key. If the project publishes its OpenAPI description, the table names come from there. Otherwise it tries a fixed list of common table names (`profiles`, `users`, `orders`, `invoices`, …) plus any names passed with `--tables`.
2. For each table (at most 60), it requests `/rest/v1/<table>?select=*&limit=1`, exactly as the app's own frontend could.
3. Interpretation:
   - **rows returned** → the table is readable by anyone. Reported with the column names only. Severity is **critical** if a column name suggests personal or sensitive data (`email`, `phone`, `password`, `token`, `address`, `iban`, …), **high** otherwise.
   - **empty array** → either the table is empty or RLS filters every row for an anonymous user. Not reported as a problem.
   - **401 / 403 / 404** → protected or nonexistent. Not reported.

Row values are read into memory only to count them and list column names. They are never printed, written to disk, or included in the JSON output.

### 3. Public storage buckets

**How:** it requests `/storage/v1/bucket` with the public key. If the response lists buckets marked `public: true`, each one is reported. No file inside a bucket is downloaded.

## Severity and confidence

Every finding has two independent ratings.

**Severity** is how bad the issue would be if real: `critical`, `high`, `medium`, or `info`.

**Confidence** is how much the tool actually proved:

| Confidence | Meaning | Used for |
|---|---|---|
| `demonstrated` | The tool observed the issue directly, with evidence. | Table returned rows to an anonymous request; a Supabase key decoding to `service_role` is present in the shipped code. |
| `weakness` | A real gap in a defense, but the tool did not prove it is exploitable. | A string matches a provider's secret-key format (validity is never checked); a bucket is marked public (no file was fetched). |
| `observation` | Worth knowing, not a vulnerability on its own. | The database publishes its table list. |

The exit code is `2` when at least one `critical` or `high` finding is present, regardless of confidence, so CI pipelines fail on anything worth looking at.

## Known false positives

- **Intentionally public tables.** A `products` or `blog_posts` table readable by anyone may be exactly what you want. The tool reports that rows came back; whether that is a problem depends on your product.
- **Example or revoked keys.** A string can match a key format without being a working key (documentation, tests, revoked keys left in a bundle). The tool cannot tell, which is why these findings are marked `weakness`.
- **Sensitive-column heuristic.** Column names like `token_count` or `email_verified` contain sensitive hints and raise the severity to critical even if no personal data is stored.

## Known false negatives (limits)

- **Anything behind a login.** The tool does not test what an authenticated user can see of other users' data (IDOR, cross-tenant leaks). In practice, this is where many serious issues are.
- **Server-side code.** Server actions, API routes, webhook handlers, and business logic are not tested.
- **Lazy-loaded code.** JavaScript chunks loaded only after navigation or interaction are not downloaded, so secrets in them can be missed.
- **Scripts on other domains** are skipped.
- **Unlisted tables.** When the table list is not published, only common names and names passed with `--tables` are tested.
- **Other backends.** Only Supabase is probed. Firebase, custom APIs, and other databases are not.
- **Secret formats not in the table above** are not detected.

A clean result means "nothing found by these checks", not "this application is secure".

## Network behavior

- Requests are sent one at a time, with a 10-second timeout each.
- Every request carries the User-Agent `validra-check (+https://validra.dev)`, so server owners can identify it.
- No telemetry: the only host contacted is the application being scanned (and its Supabase project).

## Reproducing results

The test suite (`npm test`) runs every check against fake responses, without any network access. See the [README](../README.md) for usage.
