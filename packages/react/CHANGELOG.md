# @yamblog/react

## 1.1.1

### Patch Changes

- d44c4d4: `clientSearch` now delegates to core's `searchPosts`, imported from the fs-free `@yamblog/core/search` subpath so browser bundles never touch node builtins. Behavior is unchanged: an empty query still returns all posts. Package metadata now links back to the GitHub repository.
- Updated dependencies [424ab44]
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
