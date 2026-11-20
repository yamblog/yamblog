# @yamblog/next

## 2.0.0

### Major Changes

- 86745ce: Security: bump `@vercel/og` to `^1.0.3`, which pulls in `satori@0.33.5` (fixes GHSA-wx4j-mvgx-mqwp, improper escaping in Satori-generated SVG). `createOgImageHandler` is unchanged and verified inside a Next.js 16 route handler.

  **Breaking:** `@vercel/og` 1.x requires Node.js ≥ 22, so `@yamblog/next` now declares `engines.node: ">=22"` (previously Node.js 18.17+ worked). `@vercel/og` is meant to be loaded through a bundler (as Next.js does) rather than imported directly by plain Node ESM.

### Minor Changes

- f88e46d: Fix the published build and fill in the documented API.

  - **Build fix:** `dist` is now plain per-file ES modules compiled by `tsc` (React automatic runtime, `react/jsx-runtime`). Previous builds inlined a private development copy of React, `next/link` and `react-markdown` into `dist/index.js`, so `BlogListPage` (and `BlogPostPage` with prev/next/related links) threw `Invalid hook call` / `Cannot read properties of null (reading 'useContext')`, and under React 18 both components failed. The components now use your app's own `react`, `next/link` and `react-markdown`, as the peer and dependency ranges always declared. The build fails if `dist` ever contains inlined `node_modules` code or `jsxDEV` again.
  - **New entry points** (the root export is unchanged): `@yamblog/next/components`, `/metadata`, `/og`, `/rss`, `/sitemap`, `/params`, so a route can avoid loading `@vercel/og` or `react-markdown`. Every export map entry also gains a `default` condition (so `require()` works on Node versions with `require(esm)`), plus `./package.json`. `sideEffects: false` is set.
  - **`BlogPostPage`** gains the props the README already documented: `adjacent` (from `blog.getAdjacentPosts`; explicit `prev`/`next` still win) and `jsonLd` (rendered as `<script type="application/ld+json">` with `<`, `>` and `&` escaped). It also accepts `remarkPlugins`, `rehypePlugins` and `components`, forwarded to react-markdown. Prop types are exported as `BlogPostPageProps` / `BlogListPageProps`.
  - **`generatePostMetadata`**: `siteUrl` is now optional; without it URLs are root-relative (`/blog/my-post`) and Next resolves them against `metadataBase`, instead of throwing. New opt-in `ogImage` and `useCoverImage` options fill `openGraph.images` and `twitter.images`; by default no images are emitted, so existing output is unchanged. `generateBlogJsonLd`'s `siteUrl` is optional in the same way. `MetadataOptions` and `PostMetadataImage` types are exported.
  - **`createOgImageHandler`** returns `404 Not found` for an unknown slug instead of throwing (an unhandled 500).
  - **Dates** in `BlogListPage` and `BlogPostPage` are formatted with `timeZone: 'UTC'`. Date-only frontmatter (`date: 2024-01-15`) no longer shows the previous day on servers west of UTC. Note: a frontmatter date that carries a time and offset now displays its UTC calendar day.
  - Source maps now embed their sources; the dangling declaration maps are no longer published.

### Patch Changes

- Updated dependencies [f88e46d]
  - @yamblog/core@2.2.0

## 1.2.0

### Minor Changes

- d44c4d4: Support custom blog base paths: `generatePostMetadata` and `generateBlogJsonLd` accept a `basePath` option (default `/blog` — pass `blog.basePath` when you configure a custom one so canonical/JSON-LD URLs match your feeds), and `createSitemapExport` uses the blog instance's `basePath` unless overridden; all URLs are built with core's `buildPostUrl`, so messy values are normalized consistently. `createSitemapExport` also excludes drafts unless its `includeDrafts` option is set. Package metadata now links back to the GitHub repository.

### Patch Changes

- Updated dependencies [424ab44]
- Updated dependencies [d44c4d4]
  - @yamblog/core@2.0.0

## 1.1.0

### Minor Changes

- 3257b4e: version bump

### Patch Changes

- Updated dependencies [3257b4e]
  - @yamblog/core@1.1.0

## 1.0.1

### Patch Changes

- Initial release with npm publishing setup
