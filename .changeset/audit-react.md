---
'@yamblog/react': minor
---

- **Dates** in `PostCard` and `PostLayout` are formatted with `timeZone: 'UTC'`, so date-only frontmatter (`date: 2024-01-15`) no longer shows the previous day west of UTC and server/client renders no longer disagree (a hydration mismatch). Note: a frontmatter date that carries a time and offset now displays its UTC calendar day.
- **Search:** `clientSearch` and `useBlog` are now generic and accept the slimmer `blog.generateSearchIndex()` entries as well as full posts (entries without `content` used to throw). They return the same objects you pass in; existing `Post[]` callers get the same types and results. New `SearchablePost` type export. `useBlog` filters on a deferred copy of the query (`useDeferredValue`) so typing stays responsive on large lists; `query` itself still updates immediately.
- **Packaging:** the export map gains a `default` condition (so `require()` works on Node versions with `require(esm)`) and `./package.json`; `sideEffects: false` is set; the build cleans `dist` first; source maps embed their sources and the dangling declaration maps are no longer published.
