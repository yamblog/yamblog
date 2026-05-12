# @yamblog/core

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
