---
"@yamblog/core": minor
---

New configuration and query APIs, plus feed and URL fixes:

- Add `basePath` config option (default `/blog`) — RSS, sitemap, and llms.txt URLs are now built as `{siteUrl}{basePath}/{slug}` instead of a hardcoded `/blog` prefix. Set `basePath: ''` to mount posts at the site root. The URL rule lives in one place: the new exported `buildPostUrl(siteUrl, basePath, slug)` helper (with `DEFAULT_BASE_PATH`).
- Add `includeDrafts` config option to include posts marked `draft: true` in query results (useful for local previews). Generated public artifacts — RSS, sitemap, llms.txt, and the search index — still exclude drafts unless their own `includeDrafts` option is passed, so preview deployments can't accidentally publish drafts.
- Add `findPostBySlug(slug)` — returns the post or `null`, as a non-throwing alternative to `getPostBySlug`.
- In development (`NODE_ENV=development`) the posts cache is invalidated when content files change (filename/mtime fingerprint), so edits show up without restarting the dev server while repeated calls within one render still share a single load.
- `defaultSlugify` now sanitizes filenames into URL-safe slugs (lowercase, spaces/underscores → dashes, unsafe characters stripped). Filenames that were already lowercase-and-dashed produce identical slugs; pass a custom `slugify` to keep the old behavior for other filenames. Filenames that would sanitize to an empty slug (e.g. entirely non-Latin names) now fail the build with an error naming the file — rename it or pass a custom `slugify`.
- RSS feeds now include an `atom:link rel="self"` reference (default `{siteUrl}/feed.xml`, matching where the docs and examples mount the feed; configurable via `feedUrl`), a `lastBuildDate`, and a configurable `language` (default `en-us`).
- Export `searchPosts`, `defaultSlugify`, `normalizeBasePath`, `buildPostUrl`, and `DEFAULT_BASE_PATH` from the package root. `searchPosts` is also available from the new fs-free `@yamblog/core/search` subpath, safe to import in browser bundles.
