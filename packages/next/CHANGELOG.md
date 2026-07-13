# @yamblog/next

## 1.2.0

### Minor Changes

- d44c4d4: Support custom blog base paths: `generatePostMetadata` and `generateBlogJsonLd` accept a `basePath` option (default `/blog` — pass `blog.basePath` when you configure a custom one so canonical/JSON-LD URLs match your feeds), and `createSitemapExport` uses the blog instance's `basePath` unless overridden; all URLs are built with core's `buildPostUrl`, so messy values are normalized consistently. `createSitemapExport` also excludes drafts unless its `includeDrafts` option is set. Package metadata now links back to the GitHub repository.

### Patch Changes

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
