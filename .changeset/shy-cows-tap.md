---
"@yamblog/react": patch
---

`clientSearch` now delegates to core's `searchPosts`, imported from the fs-free `@yamblog/core/search` subpath so browser bundles never touch node builtins. Behavior is unchanged: an empty query still returns all posts. Package metadata now links back to the GitHub repository.
