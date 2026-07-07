---
"@yamblog/next": minor
---

Support custom blog base paths: `generatePostMetadata` and `generateBlogJsonLd` accept a `basePath` option (default `/blog`), and `createSitemapExport` uses the blog instance's `basePath` unless overridden. Package metadata now links back to the GitHub repository.
