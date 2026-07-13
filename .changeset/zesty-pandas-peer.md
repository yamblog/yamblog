---
"@yamblog/core": minor
"@yamblog/astro": minor
---

Declare `zod` as a peer dependency instead of a regular one.

`defineBlog`/`createBlog` and `yamblogLoader` accept Zod schemas built with
*your* `zod`, so bundling a private copy risked two zod instances — type
mismatches on `schema:` options and broken `instanceof` checks when versions
drift. Both packages now declare `"zod": "^3.22.4"` in `peerDependencies`
(`@yamblog/astro` previously didn't declare its zod usage at all and relied
on hoisting).

No action needed for most setups: npm ≥7, pnpm (with auto-install-peers), and
bun install peer dependencies automatically. If your package manager doesn't,
add `zod` to your app's dependencies — you almost certainly already have it.
