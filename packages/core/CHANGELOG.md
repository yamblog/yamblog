# @yamblog/core

## 2.2.0

### Minor Changes

- f88e46d: Security and robustness fixes from an audit, plus a new `serializeJsonLd` helper.

  **Security**

  - Executable front matter is no longer evaluated. gray-matter's built-in `---js` / `---javascript` engine ran the front matter block with `eval`, so a markdown file from a CMS, a user submission or an AI agent could run code during a build. Such files now fail with an error naming the file. YAML and `---json` front matter are unchanged. **Behaviour change:** if you deliberately used `---js` front matter, convert it to YAML or JSON.
  - `llms.txt`: line breaks and control characters in titles, excerpts and `sectionTitle` are collapsed to spaces, and `[`, `]` and `\` in link text are backslash-escaped, so front matter can no longer rewrite links or inject lines. Titles containing brackets now appear escaped in the raw file (`\[Guide\] Foo`); they render the same as markdown.
  - RSS and sitemap URLs (`<link>`, `<guid>`, `<loc>`, channel link) are XML-escaped, and characters XML 1.0 forbids (stray control characters) are stripped from feed and sitemap text. Output is unchanged for default slugs.
  - New export `serializeJsonLd(value)`: `JSON.stringify` with `<`, `>`, `&`, U+2028 and U+2029 escaped as `\uXXXX`, safe to place inside `<script type="application/ld+json">`.

  **Fixes**

  - An empty `date:` (YAML null), a boolean date, or a number below 1e11 (such as a bare year, `date: 2024`, or `date: 0`) is now rejected with an error naming the file, instead of silently becoming a 1970 date. Larger numbers are still read as millisecond timestamps. String dates are parsed exactly as before. **Behaviour change:** a site with an empty or year-only `date:` that used to build (with a 1970 date) now fails until the date is fixed.
  - Custom schemas that do not extend `defaultSchema`: a literal `draft: true` in a post now marks it as a draft even when the schema does not declare `draft` (previously the key was stripped and the draft was published to queries, RSS, sitemap, llms.txt and the search index). If your schema declares `draft`, its output still decides. Methods that need `title`/`date`/`tags` (default sort, search, getPostsByTag, getRelatedPosts, RSS, sitemap, search index) now throw a descriptive error instead of a bare `TypeError`. **Behaviour change:** such draft posts are now hidden.
  - `getPosts()`/`getPostsSync()` return a fresh array each call, so sorting or reversing the result in place no longer reorders later calls, adjacent posts, RSS or sitemap. The post objects are still shared; only array identity between calls changes.
  - Generator options with an explicit `undefined` (for example `siteUrl: process.env.SITE_URL` when the variable is unset) now fall back to the blog config instead of crashing or reverting `basePath` to `/blog`.
  - `generateRss`/`generateSitemap` log a one-time `console.warn` when the site URL is empty or not an absolute http(s) URL (the output contains relative links). Output is unchanged.
  - `defineBlog()` on Vercel: production deployments (`VERCEL_ENV=production`) now use `VERCEL_PROJECT_PRODUCTION_URL` before the per-deployment `VERCEL_URL`. Preview deployments and explicitly set `SITE` / `PUBLIC_SITE_URL` / `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_BASE_URL` are unaffected. **Behaviour change:** production sites relying on the `VERCEL_URL` fallback get their production domain in feed links, so RSS `<guid>`s change once.
  - YAML and file-read errors now name the file and keep the original error as `cause`. Directories whose name ends in `.md` inside the content directory are skipped instead of crashing every call.
  - Reading time counts Chinese and Japanese characters at ~500 per minute (previously a whole CJK post read as 1 minute). Values for other text are unchanged.
  - `defaultSlugify` gives filenames with no ASCII letters or digits (for example `日本語.md`) a Unicode slug instead of throwing "produced an empty slug". Slugs that already worked are unchanged.
  - `LlmsTxtOptions` takes an optional schema type parameter, so `generateLlmsTxt({ filter })` is typed against the blog's schema (`p.company` on a custom schema). Existing `LlmsTxtOptions` references keep compiling.
  - gray-matter's global parse cache is no longer used, so dev sessions no longer keep a copy of every saved file version.
  - Development mode reuses the content-directory check for 100 ms instead of statting every file on each method call, and search no longer lowercases every post body on each query.

  **Packaging**

  - `exports` entries gain a `default` condition (and `./package.json` is exported), so `require('@yamblog/core')` works on Node versions with `require(esm)` support. ESM imports are unchanged.
  - The published package now includes `src/`, so the shipped source maps resolve.

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
