---
"@yamblog/core": minor
---

Security and robustness fixes from an audit, plus a new `serializeJsonLd` helper.

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
