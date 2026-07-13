# @yamblog/astro

## 1.3.0

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

### Patch Changes

- Updated dependencies [ca755e3]
  - @yamblog/core@2.1.0

## 1.2.0

### Minor Changes

- d44c4d4: `yamblogLoader` now derives its collection schema from the core `defaultSchema` (or your custom schema) and always adds the system fields (`id`, `slug`, `content`, `readingTime`). Previously a custom schema replaced the collection schema entirely, dropping the system fields from Astro's types.

### Patch Changes

- Updated dependencies [424ab44]
- Updated dependencies [d44c4d4]
- Updated dependencies [d44c4d4]
  - @yamblog/core@2.0.0
  - @yamblog/remark@1.1.1

## 1.1.1

### Patch Changes

- Add generic schema support for typed custom frontmatter fields.

  `createBlog` and `defineBlog` now accept an optional custom Zod schema, and all query and parser functions are fully generic. Post types are inferred from the provided schema, so custom frontmatter fields are typed end-to-end.

- Updated dependencies
  - @yamblog/core@1.2.0

## 1.1.0

### Minor Changes

- 3257b4e: version bump

### Patch Changes

- Updated dependencies [3257b4e]
  - @yamblog/core@1.1.0
  - @yamblog/remark@1.1.0

## 1.0.1

### Patch Changes

- Initial release with npm publishing setup
