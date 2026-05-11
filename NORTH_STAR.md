# Yamblog — North Star

> A multi-framework markdown blog engine for modern app builders who want search discoverability without rebuilding blog infrastructure in every repo.

**Package scope:** `@yamblog/*`  
**Spec version:** 0.2.0  
**Last updated:** 2026-05-09

---

## Vision

Yamblog exists because even in a world full of vibe-coded SaaS apps, a blog still matters. It is still one of the clearest ways to earn search discoverability, explain what a product does, and compound distribution over time.

After building multiple projects, the same pattern kept repeating: every app needed a blog, and every blog needed the same base layer. Markdown parsing, frontmatter validation, slugs, feeds, sitemap generation, search, metadata, and rendering all had to be wired up again. Rebuilding that stack in each project was wasted work, wasted tokens, and wasted energy.

This project is the answer to that repetition. Yamblog makes a product blog feel like application code instead of content infrastructure. Posts live in the repo as markdown files. The core stays framework-agnostic. Adapters handle the integration points each framework cares about.

The design motivation is also shaped by Astro Starlight. Starlight proved that a clean content system can feel great, but my preferred stack is React and Next.js, so Yamblog takes that inspiration and pushes it into a multi-framework package system.

Yamblog should also be explicitly vibe-coding friendly. Setting up a blog, writing posts, validating content, and maintaining the publishing workflow should feel natural for both humans and AI agents working directly inside a codebase.

The target outcome is simple:

- write posts as `.md`
- keep schema and behavior type-safe
- ship metadata, feeds, sitemaps, related content, and search without a CMS
- let AI agents author, validate, and publish content as a normal engineering workflow
- save builders time by turning repeated blog setup into reusable infrastructure
- make setup, writing, and maintenance straightforward in vibe-coding workflows

## What Has Been Built

Yamblog is no longer a scaffold. The codebase now contains:

- a working `@yamblog/core` package with parsing, querying, search, related posts, RSS, sitemap, search index generation, `defineBlog()`, and `llms.txt` generation
- a working `@yamblog/next` adapter with metadata helpers, JSON-LD helpers, RSS and sitemap handlers, static params, OG image support, and prebuilt page components
- a working `@yamblog/astro` adapter with a Content Layer loader and Astro components
- a working `@yamblog/react` adapter with client search, a `useBlog()` hook, markdown rendering, and prebuilt components
- a working `@yamblog/remark` package with `remarkToc`, `remarkInteractive`, `remarkEmbed`, and `toHtml()`
- example apps for Next.js, Astro, and React/Vite
- end-user docs under `docs/`
- an in-progress `website/` Astro + Starlight workspace for the marketing/docs site

This document should describe the repo as it exists now, not as an aspirational scaffold.

## Why Open Source

Yamblog is open source because this problem shows up repeatedly across independent projects, side projects, product launches, and internal tools. A reusable blog engine is a better use of effort than custom-building the same system over and over.

If Yamblog can save people time, reduce token spend, and cut down wasted engineering energy, then publishing it openly is the right default.

---

## Product Shape

### 1. `@yamblog/core`

The core package is the single source of truth.

Current responsibilities:

- read `.md` files from a configured content directory
- parse YAML frontmatter with `gray-matter`
- validate frontmatter with Zod
- derive stable post IDs as `blog-{slug}`
- derive slugs from filenames
- compute reading time
- filter drafts out of normal queries
- query posts by slug, category, tag, and featured status
- return all categories and tags
- run relevance-ranked full-text search
- compute adjacent posts
- compute related posts with configurable strategy and scoring
- generate RSS XML
- generate sitemap XML
- generate an `llms.txt` section for blog content
- generate a serializable search index
- cache post loading per blog instance

Public entry points today:

```ts
import { createBlog, defineBlog, generateLlmsTxt } from '@yamblog/core';
```

Key blog methods today:

```ts
const blog = createBlog({ contentDir: './content/posts' });

await blog.getPosts();
await blog.getPostBySlug('hello-world');
await blog.getPostsByCategory('guides');
await blog.getPostsByTag('typescript');
await blog.getFeaturedPosts();
await blog.search('agent workflow');
await blog.getAdjacentPosts('hello-world');
await blog.getRelatedPosts('hello-world');
await blog.getCategories();
await blog.getTags();
await blog.generateRss({ title, description });
await blog.generateSitemap();
await blog.generateLlmsTxt();
await blog.generateSearchIndex();
```

### 2. `@yamblog/next`

The Next adapter is implemented, not planned.

Current exports:

- `generatePostMetadata`
- `generateBlogJsonLd`
- `generateBreadcrumbJsonLd`
- `createRssHandler`
- `createSitemapExport`
- `createStaticParams`
- `createOgImageHandler`
- `BlogListPage`
- `BlogPostPage`

The package is aimed at App Router usage and covers the usual blog integration work without forcing a design system.

### 3. `@yamblog/astro`

The Astro adapter is implemented around Astro Content Layer.

Current exports:

- `yamblogLoader`
- `YamblogLoaderOptions`

The package also contains:

- `src/components/BlogListPage.astro`
- `src/components/BlogPostPage.astro`

The repo’s Astro example uses `defineCollection({ loader: yamblogLoader(...) })`, which confirms the package is already usable in a real project shape.

### 4. `@yamblog/react`

The React adapter is implemented for Vite-style SPAs and similar client-rendered apps.

Current exports:

- `useBlog`
- `MarkdownRenderer`
- `PostCard`
- `PostList`
- `PostLayout`
- `clientSearch`

The repo’s React example serializes posts ahead of time and rehydrates `date` values client-side, which establishes the intended SPA workflow.

### 5. `@yamblog/remark`

The remark package is implemented and already used in the repo.

Current exports:

- `remarkToc`
- `remarkInteractive`
- `remarkEmbed`
- `toHtml`

`toHtml()` runs a unified pipeline:

`remark-parse -> custom remark plugins -> remark-rehype -> custom rehype plugins -> rehype-stringify`

This package is already consumed by the website blog post page to render markdown with directive-powered interactive components.

---

## Current Data Model

Default frontmatter schema:

```yaml
---
title: "Post Title"
date: "2026-01-15"
excerpt: "One or two sentence summary."
category: "guides"
tags: ["typescript", "agents"]
author: "Author Name"
coverImage: "/images/post.jpg"
featured: false
draft: false
---
```

Computed fields added by core:

- `id` -> `blog-{slug}`
- `slug` -> derived from filename
- `content` -> raw markdown body
- `readingTime` -> estimated minutes at 200 WPM

Important current behavior:

- `slug` is not authored in frontmatter
- `draft: true` excludes a post from normal queries
- `featured: true` drives featured queries
- `generateLlmsTxt()` defaults to including featured posts unless a custom filter is supplied

---

## Monorepo Reality

Current top-level workspaces:

```text
packages/*
examples/*
website
```

Current package layout:

```text
packages/
  core/
    src/
      blog.ts
      define.ts
      llms.ts
      parser.ts
      query.ts
      related.ts
      rss.ts
      search.ts
      sitemap.ts
      types.ts
      utils.ts
    test/
  next/
    src/
      components/
      metadata.ts
      og.tsx
      params.ts
      rss.ts
      sitemap.ts
  astro/
    src/
      components/
      loader.ts
  react/
    src/
      components/
      MarkdownRenderer.tsx
      search.ts
      useBlog.ts
  remark/
    src/
      embed.ts
      interactive.ts
      toHtml.ts
      toc.ts
```

Current example apps:

- `examples/with-next` -> Next.js example app
- `examples/with-astro` -> Astro example with `yamblogLoader`, feed, and sitemap routes
- `examples/with-react` -> Vite React example with generated post JSON and blog pages

Current website workspace:

- `website/` uses Astro and Starlight
- includes a marketing landing page under `src/pages/index.astro`
- includes simple blog routes under `src/pages/blog/`
- includes custom styles under `src/styles/starlight.css`
- is present and actively being worked on, but is not yet the canonical polished docs site

---

## Documentation State

The old planning artifacts have largely been replaced by user-facing docs.

Current docs coverage includes:

- [docs/getting-started.md](docs/getting-started.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/extensibility.md](docs/extensibility.md)
- [docs/ai-agent-authoring.md](docs/ai-agent-authoring.md)
- [docs/llms-txt.md](docs/llms-txt.md)
- [docs/recipes/nextjs.md](docs/recipes/nextjs.md)
- [docs/recipes/astro.md](docs/recipes/astro.md)
- [docs/recipes/react.md](docs/recipes/react.md)

Recent documentation work added first-class coverage for `llms.txt`, including how Yamblog generates the blog section and how to serve the final file from Next.js or Astro.

---

## Recent Progress

The most recent meaningful additions in the repo history are:

- core support for `generateLlmsTxt`
- `LlmsTxtOptions` and blog-level `generateLlmsTxt()` wiring
- user-facing `docs/llms-txt.md`
- earlier completion of the Astro, React, and Remark packages
- earlier completion of pending Next and Core features
- replacement of internal planning docs with public-facing documentation

In other words, the project has moved from “architecture + scaffolding” into “usable library with examples and docs.”

---

## North Star From Here

The strategic direction should stay the same:

1. Keep the core package boring, predictable, and framework-agnostic.
2. Keep adapters thin and idiomatic to their ecosystems.
3. Treat markdown authoring and agent authoring as first-class workflows.
4. Ship the integration primitives teams actually need: metadata, feeds, sitemaps, search, related content, and machine-readable site context such as `llms.txt`.
5. Keep design optional. Yamblog should provide data and integration helpers first, and opinionated UI only where it materially accelerates adoption.

## Immediate Gaps

The codebase is materially ahead of this document’s previous version, but a few repo-level gaps are still visible:

- the `website/` workspace still contains starter-level pieces and should be brought to production quality
- some example/readme content is still generic framework boilerplate rather than Yamblog-specific guidance
- the North Star should keep distinguishing between “implemented”, “documented”, and “production-hardened” so it stays honest

---

## Working Definition Of Done

Yamblog is succeeding when a team can:

- install one core package and one adapter
- point it at a markdown directory
- render a blog in its framework of choice
- get metadata, RSS, sitemap, related posts, and search with minimal glue code
- let an AI agent safely create and validate posts
- expose a useful `llms.txt` file describing the site’s blog content

That is the product the repo is now converging on, and most of that surface already exists in code.
