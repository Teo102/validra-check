# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Confidence level on every finding (`demonstrated`, `weakness`, `observation`), shown in the CLI and the JSON output, alongside severity.
- Detection of a local Supabase stack (`http://127.0.0.1:54321`) and of keys issued by the Supabase CLI (`iss: "supabase-demo"`).
- Deliberately vulnerable local demo app (`npm run demo`) with documented expected results, and an end-to-end test against it.
- `SECURITY.md`, `docs/METHODOLOGY.md`, "Responsible use" section, contributing guide, issue templates.
- GitHub Actions: tests on Node 18, 20 and 22.

## [0.1.0] - 2026-09-25

### Added
- First release, published on npm.
- Detection of secrets in client-side JavaScript: Supabase service_role / `sb_secret_` keys, Stripe secret keys, OpenAI, Anthropic, GitHub, AWS, Resend keys (values redacted).
- Check of which Supabase tables return rows without logging in (at most one row per table, values never printed).
- Check of public Supabase storage buckets.
- `--tables` and `--json` options; exit code 2 on critical or high findings.

[Unreleased]: https://github.com/Teo102/validra-check/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Teo102/validra-check/releases/tag/v0.1.0
