---
'@yamblog/next': minor
---

Fix the published build and fill in the documented API.

- **Build fix:** `dist` is now plain per-file ES modules compiled by `tsc` (React automatic runtime, `react/jsx-runtime`). Previous builds inlined a private development copy of React, `next/link` and `react-markdown` into `dist/index.js`, so `BlogListPage` (and `BlogPostPage` with prev/next/related links) threw `Invalid hook call` / `Cannot read properties of null (reading 'useContext')`, and under React 18 both components failed. The components now use your app's own `react`, `next/link` and `react-markdown`, as the peer and dependency ranges always declared. The build fails if `dist` ever contains inlined `node_modules` code or `jsxDEV` again.
- **New entry points** (the root export is unchanged): `@yamblog/next/components`, `/metadata`, `/og`, `/rss`, `/sitemap`, `/params`, so a route can avoid loading `@vercel/og` or `react-markdown`. Every export map entry also gains a `default` condition (so `require()` works on Node versions with `require(esm)`), plus `./package.json`. `sideEffects: false` is set.
- **`BlogPostPage`** gains the props the README already documented: `adjacent` (from `blog.getAdjacentPosts`; explicit `prev`/`next` still win) and `jsonLd` (rendered as `<script type="application/ld+json">` with `<`, `>` and `&` escaped). It also accepts `remarkPlugins`, `rehypePlugins` and `components`, forwarded to react-markdown. Prop types are exported as `BlogPostPageProps` / `BlogListPageProps`.
- **`generatePostMetadata`**: `siteUrl` is now optional; without it URLs are root-relative (`/blog/my-post`) and Next resolves them against `metadataBase`, instead of throwing. New opt-in `ogImage` and `useCoverImage` options fill `openGraph.images` and `twitter.images`; by default no images are emitted, so existing output is unchanged. `generateBlogJsonLd`'s `siteUrl` is optional in the same way. `MetadataOptions` and `PostMetadataImage` types are exported.
- **`createOgImageHandler`** returns `404 Not found` for an unknown slug instead of throwing (an unhandled 500).
- **Dates** in `BlogListPage` and `BlogPostPage` are formatted with `timeZone: 'UTC'`. Date-only frontmatter (`date: 2024-01-15`) no longer shows the previous day on servers west of UTC. Note: a frontmatter date that carries a time and offset now displays its UTC calendar day.
- Source maps now embed their sources; the dangling declaration maps are no longer published.
