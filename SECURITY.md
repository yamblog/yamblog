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
| `@yamblog/react`, `@yamblog/astro`, `@yamblog/remark` | latest 1.x |
| `@yamblog/next` | latest 1.x until 2.0.0 is released, then latest 2.x only |

The fix for the vulnerable `satori` pulled in by `@vercel/og`
([GHSA-wx4j-mvgx-mqwp](https://github.com/advisories/GHSA-wx4j-mvgx-mqwp))
ships only in `@yamblog/next` 2.x, because it needs `@vercel/og` 1.x and
therefore Node.js 22 or later. `@yamblog/next` 1.x keeps `@vercel/og` ^0.6
and stays affected; if you use `createOgImageHandler`, upgrade to 2.x.
Once 2.0.0 is released, 1.x receives no further security fixes.

## Content trust

For how yamblog treats raw HTML, embeds, JSON-LD and front matter in posts
that are not fully trusted (CMS, user or AI-written content), see
[Security and content trust](docs/security.md).

## Supply chain

Starting with the first release cut after 2026-11-05, `@yamblog/*` packages
are published from GitHub Actions via npm trusted publishing with
[provenance](https://docs.npmjs.com/generating-provenance-statements).
You can verify a release with `npm audit signatures`.

Versions published before that date (up to and including `@yamblog/core`
2.1.0, `@yamblog/astro` 1.3.0, `@yamblog/next` 1.2.0, `@yamblog/react` 1.1.1
and `@yamblog/remark` 1.1.1) were published with an npm token and carry
npm's registry signature but **no** provenance attestation; that is expected
for those versions. Any version newer than the ones listed above that lacks a
provenance attestation linking it to this repository was not published by
us; please report it as described above.
