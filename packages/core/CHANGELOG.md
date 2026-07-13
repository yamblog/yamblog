# @yamblog/core

## 2.1.0

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

## 2.0.0

### Major Changes

- d44c4d4: New configuration and query APIs, plus feed and URL fixes.

  **BREAKING: `defaultSlugify` now sanitizes filenames into URL-safe slugs** (lowercase, spaces/underscores → dashes, unsafe characters stripped). Filenames that were already lowercase-and-dashed produce identical slugs, but any other filename gets a new slug — which changes its published URL, RSS `<guid>`, and stable `blog-{slug}` ID. Migration: either rename files to match their old slugs, or pass a custom `slugify` to keep the old behavior: `slugify: (f) => f.replace(/\.mdx?$/, '')`. Filenames that would sanitize to an empty slug (e.g. entirely non-Latin names) now fail the build with an error naming the file.

  Everything else is backward compatible:

  - Add `basePath` config option (default `/blog`) — RSS, sitemap, and llms.txt URLs are now built as `{siteUrl}{basePath}/{slug}` instead of a hardcoded `/blog` prefix. Set `basePath: ''` to mount posts at the site root. The URL rule lives in one place: the new exported `buildPostUrl(siteUrl, basePath, slug)` helper (with `DEFAULT_BASE_PATH` and `normalizeSiteUrl` — a trailing slash on `siteUrl` no longer produces a double slash).
  - Add `includeDrafts` config option to include posts marked `draft: true` in query results (useful for local previews). Generated public artifacts — RSS, sitemap, llms.txt, and the search index — still exclude drafts unless their own `includeDrafts` option is passed, so preview deployments can't accidentally publish drafts.
  - Add `findPostBySlug(slug)` — returns the post or `null`, as a non-throwing alternative to `getPostBySlug`.
  - In development (`NODE_ENV=development`) the posts cache is invalidated when content files change (filename/mtime fingerprint), so edits show up without restarting the dev server while repeated calls within one render still share a single load.
  - RSS feeds now include an `atom:link rel="self"` reference (default `{siteUrl}/feed.xml`, matching where the docs and examples mount the feed; configurable via `feedUrl`), a `lastBuildDate`, and a configurable `language` (default `en-us`).
  - Export `searchPosts`, `defaultSlugify`, `normalizeBasePath`, `normalizeSiteUrl`, `buildPostUrl`, and `DEFAULT_BASE_PATH` from the package root. `searchPosts` is also available from the new fs-free `@yamblog/core/search` subpath, safe to import in browser bundles.

### Minor Changes

- 424ab44: DX: typed errors and a full synchronous API. Fully backward compatible.

  - **Typed not-found errors** — `getPostBySlug` and `getAdjacentPosts` now throw
    `PostNotFoundError` (exported, subclass of `Error`, carries a `slug` field).
    The message stays `"Post not found: {slug}"`, so existing string-matching
    `catch` blocks keep working — but you can now write
    `if (err instanceof PostNotFoundError)` instead, or avoid throwing entirely
    with `findPostBySlug` / `findPostBySlugSync` (returns `Post | null`).
  - **Sync API** — every `Blog` method has a synchronous twin: `getPostsSync`,
    `getPostBySlugSync`, `findPostBySlugSync`, `getPostsByCategorySync`,
    `getPostsByTagSync`, `getFeaturedPostsSync`, `searchSync`,
    `getAdjacentPostsSync`, `getRelatedPostsSync`, `getCategoriesSync`,
    `getTagsSync`, `generateRssSync`, `generateSitemapSync`,
    `generateLlmsTxtSync`, `generateSearchIndexSync`, and
    `validateContentSync` (also exported standalone). The engine's work is
    inherently synchronous — the sync core is now the implementation and the
    async methods are thin wrappers, so existing callers behave identically
    (including the shared posts cache). Standalone `loadAllPostsSync` /
    `loadPostsSync` are available for advanced use.
  - **Schema-typed posts everywhere** — type-level tests now guarantee that a
    custom Zod schema's fields flow to every post-returning method, sync and
    async.

  **Migration:** nothing required. If you were casting posts to read custom
  frontmatter fields (`as Awaited<...> & z.infer<typeof schema>`), delete the
  casts — the fields are typed automatically. If you were string-matching
  `"Post not found"`, switch to `instanceof PostNotFoundError` or
  `findPostBySlug`.

## 1.2.0

### Minor Changes

- Add generic schema support for typed custom frontmatter fields.

  `createBlog` and `defineBlog` now accept an optional custom Zod schema, and all query and parser functions are fully generic. Post types are inferred from the provided schema, so custom frontmatter fields are typed end-to-end.

## 1.1.0

### Minor Changes

- 3257b4e: version bump

## 1.0.1

### Patch Changes

- Initial release with npm publishing setup
