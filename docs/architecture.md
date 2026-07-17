---
title: Architecture
description: How @yamblog/* packages fit together — data flow, package overview, and internals.
---

# Architecture

## Package overview

```
@yamblog/core       Framework-agnostic engine
@yamblog/next       Next.js App Router adapter
@yamblog/astro      Astro 5 Content Layer adapter
@yamblog/react      React hooks + components (Vite / CRA)
@yamblog/remark     Optional remark plugins (TOC, embeds, interactive)
```

All framework adapters depend on `@yamblog/core`. They add thin framework-specific
wrappers — there is no duplicated business logic.

## Data flow

```
content/posts/*.md
        │
        ▼
  @yamblog/core
  ├── gray-matter   — frontmatter parsing
  ├── Zod           — schema validation (peer dependency)
  ├── Posts cache   — one I/O pass per Blog instance
  └── Blog API      — getPosts, search, RSS, sitemap, llms.txt …
        │
        ├──▶ @yamblog/next   (metadata, OG, JSON-LD, RSC)
        ├──▶ @yamblog/astro  (Content Layer loader, .astro components)
        └──▶ @yamblog/react  (useBlog hook, MarkdownRenderer, PostCard …)
```

## `@yamblog/core`

The single source of truth. Responsibilities:

- **Parser** (`parser.ts`) — reads `.md` / `.mdx` files, runs gray-matter, validates with Zod
- **Query engine** (`query.ts`) — `getPosts`, `getPostBySlug`, `findPostBySlug`, `getPostsByTag`, `getPostsByCategory`, `getFeaturedPosts`, `getAdjacentPosts`, `getRelatedPosts`
- **Typed errors** (`errors.ts`) — `getPostBySlug` / `getAdjacentPosts` throw `PostNotFoundError` (carries a `slug` field); `findPostBySlug` returns `null` instead of throwing
- **Search** (`search.ts`) — relevance-ranked full-text search over title, excerpt, tags, body; `searchPosts` is also exported from the fs-free `@yamblog/core/search` subpath, safe for browser bundles
- **Related posts** (`related.ts`) — tag overlap / category overlap / combined strategy
- **RSS** (`rss.ts`) — returns a valid RSS 2.0 XML string (atom self-link, `lastBuildDate`, configurable `language` / `feedUrl`)
- **Sitemap** (`sitemap.ts`) — returns a sitemap XML string (`<?xml ...><urlset ...>`)
- **llms.txt** (`llms.ts`) — generates the blog section of an [llms.txt](https://llmstxt.org) file
- **Validation** (`validate.ts`) — `validateContent` / `validateContentSync` for CI and build-step checks
- **URL building** (`utils.ts`) — one URL rule for RSS, sitemap, and llms.txt: `buildPostUrl(siteUrl, basePath, slug)`, with `basePath` configurable (default `/blog`)
- **Stable IDs** — every post gets `id = "blog-{slug}"` for wiring into external services
- **`defineBlog(contentDir?, siteUrl?)`** — zero-config factory; auto-detects `siteUrl` from env, resolves `contentDir` relative to `cwd`, stores `siteUrl` on the instance for RSS/sitemap

**Sync core, async wrappers:** the engine's work — reading local markdown files,
parsing, validating — is inherently synchronous, so the sync methods
(`getPostsSync`, `generateRssSync`, …) are the implementation and every async
method is a thin wrapper over its sync twin. Both share one posts cache.

Caching: the first call to any query or generator method loads and parses all
posts once; subsequent calls reuse the same array reference — no re-reads. In
development (`NODE_ENV=development`) the cache is invalidated when content files
change (filename/mtime fingerprint), so edits show up without restarting the dev
server. The exception is `validateContent` / `validateContentSync`, which
deliberately bypass the cache and re-read from disk on every call — a validator
should check what is currently on disk, not what was cached.

## `@yamblog/next`

Thin helpers that speak Next.js App Router idioms:

| Export | Purpose |
|--------|---------|
| `generatePostMetadata` | Returns `Metadata` object (OG, Twitter, canonical) |
| `generateBlogJsonLd` | Article JSON-LD for `<script type="application/ld+json">` |
| `generateBreadcrumbJsonLd` | BreadcrumbList JSON-LD |
| `createRssHandler` | `export const GET` route handler |
| `createSitemapExport` | `export default` for `app/sitemap.ts` |
| `createStaticParams` | `generateStaticParams` helper |
| `createOgImageHandler` | `@vercel/og` ImageResponse route handler |
| `BlogListPage` | Pre-built listing RSC component |
| `BlogPostPage` | Pre-built post detail RSC component |

## `@yamblog/astro`

Implements the [Astro Content Layer](https://docs.astro.build/en/guides/content-collections/) loader API:

- **`yamblogLoader`** — a loader object (`{ name, schema(), load() }`) compatible with
  `defineCollection({ loader })`. It calls `@yamblog/core` internally.
- **`BlogListPage.astro`** / **`BlogPostPage.astro`** — pre-built Astro components.

The package avoids a hard runtime dependency on the `astro` package by using
duck-typed interfaces (`AstroLoaderContext`, `AstroDataStore`) that match the
Astro 5 Content Layer contract.

## `@yamblog/react`

Client-side hooks and components for Vite SPAs:

- **`useBlog(initialPosts)`** — manages client search state (`query`, `setQuery`, filtered `posts`)
- **`clientSearch`** — relevance-scored in-memory search (title > excerpt > tags > body)
- **`MarkdownRenderer`** — thin wrapper around `react-markdown` with sensible defaults
- **`PostCard`** / **`PostList`** / **`PostLayout`** — pre-built UI components

Because SPAs run in the browser, posts must be serialised at build time. A Node script
calls `blog.getPosts()` and writes `src/generated/posts.json`, which Vite statically
imports. See `docs/recipes/react.md` for the full pattern.

## `@yamblog/remark`

Markdown-to-HTML conversion and optional remark plugins.

| Export | Purpose |
|--------|---------|
| `toHtml(markdown, options?)` | Converts markdown to an HTML string via a unified pipeline; accepts `remarkPlugins` and `rehypePlugins` |
| `remarkToc` | Replaces a `## Table of Contents` heading with a generated nested list |
| `remarkInteractive` | Converts `::component-name{prop=val}` directives to self-closing HTML elements (requires `remark-directive` peer) |
| `remarkEmbed` | Converts bare YouTube / Vimeo / CodePen URLs to iframes |

`toHtml` is used internally by `@yamblog/astro`'s `BlogPostPage` and is available
for any user who wants HTML output without the pre-built components.

## Monorepo layout

```
packages/
  core/       @yamblog/core
  next/       @yamblog/next
  astro/      @yamblog/astro
  react/      @yamblog/react
  remark/     @yamblog/remark
examples/
  with-next/  Next.js App Router example
  with-astro/ Astro 5 example
  with-react/ Vite SPA example
docs/
  getting-started.md
  architecture.md     ← you are here
  recipes/
    nextjs.md
    astro.md
    react.md
    custom-fields.md
  extensibility.md
  ai-agent-authoring.md
  prompt-for-llms.md
  llms-txt.md
website/      yamblog.dev — landing page + docs site (serves the docs/ folder)
```
