---
"@yamblog/next": minor
---

Support custom blog base paths: `generatePostMetadata` and `generateBlogJsonLd` accept a `basePath` option (default `/blog` — pass `blog.basePath` when you configure a custom one so canonical/JSON-LD URLs match your feeds), and `createSitemapExport` uses the blog instance's `basePath` unless overridden; all URLs are built with core's `buildPostUrl`, so messy values are normalized consistently. `createSitemapExport` also excludes drafts unless its `includeDrafts` option is set. Package metadata now links back to the GitHub repository.
