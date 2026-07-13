---
"@yamblog/core": minor
---

DX: typed errors and a full synchronous API. Fully backward compatible.

- **Typed not-found errors** — `getPostBySlug` and `getAdjacentPosts` now throw
  `PostNotFoundError` (exported, subclass of `Error`, carries a `slug` field).
  The message stays `"Post not found: {slug}"`, so existing string-matching
  `catch` blocks keep working — but you can now write
  `if (err instanceof PostNotFoundError)` instead, or avoid throwing entirely
  with `findPostBySlug` / `findPostBySlugSync` (returns `Post | null`).
- **Sync API** — every `Blog` method has a synchronous twin: `getPostsSync`,
  `getPostBySlugSync`, `findPostBySlugSync`, `getPostsByCategorySync`,
  `getPostsByTagSync`, `getFeaturedPostsSync`, `searchSync`,
  `getAdjacentPostsSync`, `getRelatedPostsSync`, `getCategoriesSync`,
  `getTagsSync`, `generateRssSync`, `generateSitemapSync`,
  `generateLlmsTxtSync`, `generateSearchIndexSync`, and
  `validateContentSync` (also exported standalone). The engine's work is
  inherently synchronous — the sync core is now the implementation and the
  async methods are thin wrappers, so existing callers behave identically
  (including the shared posts cache). Standalone `loadAllPostsSync` /
  `loadPostsSync` are available for advanced use.
- **Schema-typed posts everywhere** — type-level tests now guarantee that a
  custom Zod schema's fields flow to every post-returning method, sync and
  async.

**Migration:** nothing required. If you were casting posts to read custom
frontmatter fields (`as Awaited<...> & z.infer<typeof schema>`), delete the
casts — the fields are typed automatically. If you were string-matching
`"Post not found"`, switch to `instanceof PostNotFoundError` or
`findPostBySlug`.
