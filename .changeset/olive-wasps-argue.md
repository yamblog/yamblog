---
"@yamblog/astro": minor
---

`yamblogLoader` now derives its collection schema from the core `defaultSchema` (or your custom schema) and always adds the system fields (`id`, `slug`, `content`, `readingTime`). Previously a custom schema replaced the collection schema entirely, dropping the system fields from Astro's types.
