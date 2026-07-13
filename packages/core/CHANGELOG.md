# @yamblog/core

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
