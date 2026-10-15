# Contributing

Thanks for helping. A few rules keep this tool trustworthy.

## The one hard rule

validra-check stays **read-only and defensive**. It sends `GET` requests, reads at most one row per table, never prints row values, and never calls third-party APIs to check keys. Contributions that add writing, exploitation, data extraction, authentication bypass, or scanning without authorization will not be accepted.

## Good contributions

- New secret formats, with a positive test (a realistic but fake value) and a negative test (something that looks close but should not match).
- Fewer false positives, with a test showing the case that was wrongly reported.
- Clearer output and error messages.
- Corrections to [docs/METHODOLOGY.md](docs/METHODOLOGY.md) when it doesn't match the code.

## How

```bash
git clone https://github.com/Teo102/validra-check && cd validra-check
npm test          # unit tests + end-to-end test on the demo app
npm run demo      # deliberately vulnerable local app, to try changes by hand
```

There are no dependencies; please keep it that way unless there is a strong reason.

- Keep the existing code style (ES modules, small functions, comments that explain why).
- Never put a real secret in a test or an issue, even an expired one. Build fake values at runtime if they look too real (see `demo/server.js`).
- Only test on apps you own, or with written permission. Use the demo app otherwise.
- Update `CHANGELOG.md` under "Unreleased".

Security problems in the tool itself: see [SECURITY.md](SECURITY.md), not public issues.
