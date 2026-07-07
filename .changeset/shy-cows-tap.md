---
"@yamblog/react": patch
---

`clientSearch` now delegates to core's `searchPosts` instead of duplicating the scoring logic. Behavior is unchanged: an empty query still returns all posts. Package metadata now links back to the GitHub repository.
