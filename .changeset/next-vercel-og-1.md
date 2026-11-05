---
'@yamblog/next': major
---

Security: bump `@vercel/og` to `^1.0.3`, which pulls in `satori@0.33.5` (fixes GHSA-wx4j-mvgx-mqwp, improper escaping in Satori-generated SVG). `createOgImageHandler` is unchanged and verified inside a Next.js 16 route handler.

**Breaking:** `@vercel/og` 1.x requires Node.js ≥ 22, so `@yamblog/next` now declares `engines.node: ">=22"` (previously Node.js 18.17+ worked). `@vercel/og` is meant to be loaded through a bundler (as Next.js does) rather than imported directly by plain Node ESM.
