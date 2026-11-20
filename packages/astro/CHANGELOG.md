# @yamblog/astro

## 1.4.0

### Minor Changes

- f88e46d: Security, correctness and Astro 6+/7 compatibility fixes.

  - **`BlogPostPage` escapes JSON-LD.** The `jsonLd` prop is now serialised with `<`, `>`, `&`, U+2028 and U+2029 written as `\uXXXX`, so a frontmatter value such as `</script><script>…` can no longer close the script element. The parsed JSON is identical.
  - **New `sanitize` prop on `BlogPostPage`** (default `false`, unchanged behaviour). When set, it is forwarded to `toHtml(…, { sanitize: true })` from `@yamblog/remark`: raw HTML in the markdown is dropped and dangerous URLs/attributes are removed, while yamblog embeds keep working. Turn it on when post content is not fully trusted (CMS, user or AI-written posts). Requires the `@yamblog/remark` release that adds the `sanitize` option.
  - **Dates are formatted in UTC** in `BlogListPage` and `BlogPostPage`. Date-only frontmatter (`date: 2024-01-15`) no longer shows the previous day when the site is built west of UTC. Behaviour change: frontmatter dates that carry a time and offset (e.g. `2024-01-15T22:00:00-08:00`) now show their UTC day.
  - **New `failOnError` option on `yamblogLoader`.** Invalid frontmatter, a duplicate slug or a missing directory used to be only logged, and the build succeeded with an empty or stale collection. `yamblogLoader({ base, failOnError: true })` now logs and rethrows the error so the build fails. The default stays `false` (log and continue, as before), and the loader now also logs a warning that the default will become `true` in the next major version.
  - **Astro 6+/7 schema support.** Astro 6+ ignores (and warns about) loaders whose `schema` is a function. The loader now provides `createSchema()`, which returns a schema built with Astro's own zod plus generated entry types, so collection entries are typed again with no warning. On Astro 5 the existing `schema()` function is still provided. The astro peer range is unchanged.
  - **Incremental updates.** Entries get a digest (when Astro provides `generateDigest`), so unchanged posts are not rewritten; only entries whose post disappeared are removed instead of clearing the store. In `astro dev`, adding, changing or removing a `.md`/`.mdx` file under `base` reloads the collection (when Astro provides a watcher). Reload errors in dev are logged, not thrown.
  - Packaging: the `.` export gains a `default` condition (so `require()` works on Node versions with require(esm)), `./package.json` is exported, `sideEffects` is declared, and the TypeScript sources ship alongside `dist` so source and declaration maps resolve.
  - README: setup snippets now use one shared `defineBlog` instance (the previous `new URL('../content/posts', import.meta.url)` snippet pointed at the wrong directory), the loader is presented as an optional alternative, and the trust model for markdown and JSON-LD is documented.
  - New type exports: `YamblogLoader`, `YamblogLoaderSchemaResult`.

### Patch Changes

- Updated dependencies [f88e46d]
- Updated dependencies [f88e46d]
  - @yamblog/core@2.2.0
  - @yamblog/remark@1.2.0

## 1.3.0

### Minor Changes

- ca755e3: Declare `zod` as a peer dependency instead of a regular one.

  `defineBlog`/`createBlog` and `yamblogLoader` accept Zod schemas built with
  _your_ `zod`, so bundling a private copy risked two zod instances — type
  mismatches on `schema:` options and broken `instanceof` checks when versions
  drift. Both packages now declare `"zod": "^3.22.4"` in `peerDependencies`
  (`@yamblog/astro` previously didn't declare its zod usage at all and relied
  on hoisting).

  No action needed for most setups: npm ≥7, pnpm (with auto-install-peers), and
  bun install peer dependencies automatically. If your package manager doesn't,
  add `zod` to your app's dependencies — you almost certainly already have it.

### Patch Changes

- Updated dependencies [ca755e3]
  - @yamblog/core@2.1.0

## 1.2.0

### Minor Changes

- d44c4d4: `yamblogLoader` now derives its collection schema from the core `defaultSchema` (or your custom schema) and always adds the system fields (`id`, `slug`, `content`, `readingTime`). Previously a custom schema replaced the collection schema entirely, dropping the system fields from Astro's types.

### Patch Changes

- Updated dependencies [424ab44]
- Updated dependencies [d44c4d4]
- Updated dependencies [d44c4d4]
  - @yamblog/core@2.0.0
  - @yamblog/remark@1.1.1

## 1.1.1

### Patch Changes

- Add generic schema support for typed custom frontmatter fields.

  `createBlog` and `defineBlog` now accept an optional custom Zod schema, and all query and parser functions are fully generic. Post types are inferred from the provided schema, so custom frontmatter fields are typed end-to-end.

- Updated dependencies
  - @yamblog/core@1.2.0

## 1.1.0

### Minor Changes

- 3257b4e: version bump

### Patch Changes

- Updated dependencies [3257b4e]
  - @yamblog/core@1.1.0
  - @yamblog/remark@1.1.0

## 1.0.1

### Patch Changes

- Initial release with npm publishing setup
