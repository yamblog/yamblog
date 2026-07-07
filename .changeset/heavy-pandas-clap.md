---
"@yamblog/core": minor
---

New configuration and query APIs, plus feed and URL fixes:

- Add `basePath` config option (default `/blog`) — RSS, sitemap, and llms.txt URLs are now built as `{siteUrl}{basePath}/{slug}` instead of a hardcoded `/blog` prefix. Set `basePath: ''` to mount posts at the site root.
- Add `includeDrafts` config option to include posts marked `draft: true` in query results (useful for local previews).
- Add `findPostBySlug(slug)` — returns the post or `null`, as a non-throwing alternative to `getPostBySlug`.
- Skip the posts cache when `NODE_ENV=development` so content edits show up without restarting the dev server.
- `defaultSlugify` now sanitizes filenames into URL-safe slugs (lowercase, spaces/underscores → dashes, unsafe characters stripped). Filenames that were already lowercase-and-dashed produce identical slugs; pass a custom `slugify` to keep the old behavior for other filenames.
- RSS feeds now include an `atom:link rel="self"` reference (configurable via `feedUrl`), a `lastBuildDate`, and a configurable `language` (default `en-us`).
- Export `searchPosts`, `defaultSlugify`, and `normalizeBasePath` from the package root.
