# Security policy

validra-check is a security tool, so a flaw in it matters twice: it could mislead people about their own app, or behave in a way it promises not to.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Report it privately, in one of two ways:

1. **GitHub private vulnerability reporting** (preferred): go to the [Security tab](https://github.com/Teo102/validra-check/security) and click "Report a vulnerability".
2. **Email:** teobrondel6@gmail.com, with "validra-check security" in the subject.

Please include the version (`npx validra-check --version`), what you observed, and the smallest way to reproduce it. If the reproduction involves a real application, use one you own or are authorized to test, and do not include real secrets or personal data in the report.

## What to expect

This is a project maintained by one person. I will:

- acknowledge your report within 5 business days;
- tell you whether I can reproduce it and what I plan to do;
- credit you in the release notes if you wish, once a fix is published.

Please give me a reasonable time to fix the issue before disclosing it publicly. 90 days is the default; we can agree on something shorter if the issue is being exploited.

## In scope

- The tool sending anything other than `GET` requests, or reading more than it documents (one row per table at most).
- The tool printing or storing row values, or printing a secret in full instead of redacted.
- The tool sending data anywhere other than the application being scanned.
- Incorrect results that would make someone believe an exposed app is safe (false negatives on documented checks).
- Vulnerabilities in the tool's own code or its published npm package.

## Out of scope

- Findings about third-party applications discovered with the tool. Report those to the application's owner, not here.
- Feature requests to make the tool do more than read (see [Responsible use](README.md#responsible-use)). The tool stays read-only by design.

## Supported versions

Only the latest published version on npm receives fixes.
