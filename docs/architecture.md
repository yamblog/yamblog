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
  ├── Zod           — schema validation
  ├── Promise cache — one I/O pass per Blog instance
  └── Blog API      — getPosts, search, RSS, sitemap …
        │
        ├──▶ @yamblog/next   (metadata, OG, JSON-LD, RSC)
        ├──▶ @yamblog/astro  (Content Layer loader, .astro components)
        └──▶ @yamblog/react  (useBlog hook, MarkdownRenderer, PostCard …)
```

## `@yamblog/core`

The single source of truth. Responsibilities:

- **Parser** (`parser.ts`) — reads `.md` / `.mdx` files, runs gray-matter, validates with Zod
- **Query engine** (`query.ts`) — `getPosts`, `getPostBySlug`, `getPostsByTag`, `getPostsByCategory`, `getFeaturedPosts`, `getAdjacentPosts`, `getRelatedPosts`
- **Search** (`search.ts`) — relevance-ranked full-text search over title, excerpt, tags, body
- **Related posts** (`related.ts`) — tag overlap / category overlap / combined strategy
- **RSS** (`rss.ts`) — returns a valid RSS 2.0 XML string
- **Sitemap** (`sitemap.ts`) — returns a sitemap XML string (`<?xml ...><urlset ...>`)
- **Stable IDs** — every post gets `id = "blog-{slug}"` for wiring into external services
- **`defineBlog(contentDir?, siteUrl?)`** — zero-config factory; auto-detects `siteUrl` from env, resolves `contentDir` relative to `cwd`, stores `siteUrl` on the instance for RSS/sitemap

Caching: the first call to any method triggers `loadPosts()`, which is stored as a
resolved `Promise<Post[]>` on the `Blog` instance. Subsequent calls reuse the same
array reference — no re-reads.

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
  extensibility.md
  ai-agent-authoring.md
```
