# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report vulnerabilities privately through GitHub's
[private vulnerability reporting](https://github.com/yamblog/yamblog/security/advisories/new)
(Security tab → "Report a vulnerability"). You'll get an acknowledgement
within a few days, and we'll coordinate a fix and disclosure with you through
the advisory.

## Supported versions

Security fixes land on `main` and ship in the latest release line of each
package:

| Package | Supported |
| --- | --- |
| `@yamblog/core` | latest 2.x |
| `@yamblog/next`, `@yamblog/react`, `@yamblog/astro`, `@yamblog/remark` | latest 1.x |

## Supply chain

All `@yamblog/*` packages are published from GitHub Actions via npm trusted
publishing with [provenance](https://docs.npmjs.com/generating-provenance-statements).
You can verify a release with `npm audit signatures`. A version without a
provenance attestation linking it to this repository was not published by us.
