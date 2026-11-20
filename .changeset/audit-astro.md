---
"@yamblog/astro": minor
---

Security, correctness and Astro 6+/7 compatibility fixes.

- **`BlogPostPage` escapes JSON-LD.** The `jsonLd` prop is now serialised with `<`, `>`, `&`, U+2028 and U+2029 written as `\uXXXX`, so a frontmatter value such as `</script><script>…` can no longer close the script element. The parsed JSON is identical.
- **New `sanitize` prop on `BlogPostPage`** (default `false`, unchanged behaviour). When set, it is forwarded to `toHtml(…, { sanitize: true })` from `@yamblog/remark`: raw HTML in the markdown is dropped and dangerous URLs/attributes are removed, while yamblog embeds keep working. Turn it on when post content is not fully trusted (CMS, user or AI-written posts). Requires the `@yamblog/remark` release that adds the `sanitize` option.
- **Dates are formatted in UTC** in `BlogListPage` and `BlogPostPage`. Date-only frontmatter (`date: 2024-01-15`) no longer shows the previous day when the site is built west of UTC. Behaviour change: frontmatter dates that carry a time and offset (e.g. `2024-01-15T22:00:00-08:00`) now show their UTC day.
- **New `failOnError` option on `yamblogLoader`.** Invalid frontmatter, a duplicate slug or a missing directory used to be only logged, and the build succeeded with an empty or stale collection. `yamblogLoader({ base, failOnError: true })` now logs and rethrows the error so the build fails. The default stays `false` (log and continue, as before), and the loader now also logs a warning that the default will become `true` in the next major version.
- **Astro 6+/7 schema support.** Astro 6+ ignores (and warns about) loaders whose `schema` is a function. The loader now provides `createSchema()`, which returns a schema built with Astro's own zod plus generated entry types, so collection entries are typed again with no warning. On Astro 5 the existing `schema()` function is still provided. The astro peer range is unchanged.
- **Incremental updates.** Entries get a digest (when Astro provides `generateDigest`), so unchanged posts are not rewritten; only entries whose post disappeared are removed instead of clearing the store. In `astro dev`, adding, changing or removing a `.md`/`.mdx` file under `base` reloads the collection (when Astro provides a watcher). Reload errors in dev are logged, not thrown.
- Packaging: the `.` export gains a `default` condition (so `require()` works on Node versions with require(esm)), `./package.json` is exported, `sideEffects` is declared, and the TypeScript sources ship alongside `dist` so source and declaration maps resolve.
- README: setup snippets now use one shared `defineBlog` instance (the previous `new URL('../content/posts', import.meta.url)` snippet pointed at the wrong directory), the loader is presented as an optional alternative, and the trust model for markdown and JSON-LD is documented.
- New type exports: `YamblogLoader`, `YamblogLoaderSchemaResult`.
