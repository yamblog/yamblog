# YAMBLOG

**File-based markdown blogging for modern web apps. Type-safe, framework-agnostic, zero-config.**

[![CI](https://github.com/yamblog/yamblog/actions/workflows/ci.yml/badge.svg)](https://github.com/yamblog/yamblog/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40yamblog%2Fcore?label=%40yamblog%2Fcore)](https://www.npmjs.com/package/@yamblog/core)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Drop markdown files in a folder, get a fully typed blog: posts, categories, tags, search, related posts, RSS, sitemap, OG images, JSON-LD, and `llms.txt` — with adapters for Next.js, Astro, and plain React.

```text
content/posts/hello-world.md  →  https://yoursite.com/blog/hello-world
```

## Why YAMBLOG?

- **Files, not a CMS** — posts are markdown files with YAML frontmatter, versioned in git next to your code.
- **Type-safe frontmatter** — validated with [Zod](https://zod.dev) at build time. Extend the schema and your custom fields are typed end to end.
- **Framework adapters, one core** — the same content model renders in Next.js App Router, Astro Content Layer, or any React app.
- **SEO out of the box** — RSS 2.0, sitemap, canonical URLs, OpenGraph/Twitter metadata, JSON-LD, and dynamic OG images.
- **AI-friendly** — generates `llms.txt`, ships a search index, and has a content model simple enough that an agent can write and validate posts ([docs](docs/ai-agent-authoring.md)).
- **Fails loudly** — invalid frontmatter, missing directories, and duplicate slugs throw at build time, not at runtime in production.

## Quick start (Next.js)

```bash
npm install @yamblog/core @yamblog/next
```

```md
<!-- content/posts/hello-world.md -->
---
title: "Hello World"
date: 2026-01-15
excerpt: "My first post."
tags: [intro]
---

Welcome to my blog!
```

```ts
// lib/blog.ts
import { defineBlog } from '@yamblog/core';

export const blog = defineBlog('content/posts');
```

```tsx
// app/blog/page.tsx
import { BlogListPage } from '@yamblog/next';
import { blog } from '@/lib/blog';

export default async function Page() {
  const posts = await blog.getPosts();
  return <BlogListPage posts={posts} />;
}
```

That's it — see the [getting started guide](https://yamblog.dev/getting-started/) for post pages, RSS, sitemap, and OG images.

## Packages

| Package | Description |
| --- | --- |
| [`@yamblog/core`](packages/core) | Framework-agnostic engine: parsing, validation, queries, search, related posts, RSS, sitemap, `llms.txt` |
| [`@yamblog/next`](packages/next) | Next.js adapter: App Router metadata, JSON-LD, RSS/sitemap handlers, OG image routes, page components |
| [`@yamblog/react`](packages/react) | React adapter: markdown renderer, client-side search hook, UI components |
| [`@yamblog/astro`](packages/astro) | Astro adapter: Content Layer loader and `.astro` page components |
| [`@yamblog/remark`](packages/remark) | Remark/rehype plugins: table of contents, embeds, interactive blocks |

## Core API at a glance

```ts
const posts    = await blog.getPosts();               // all published posts, newest first
const post     = await blog.getPostBySlug('hello');   // throws if missing
const maybe    = await blog.findPostBySlug('hello');  // null if missing
const tagged   = await blog.getPostsByTag('react');
const results  = await blog.search('typescript');
const related  = await blog.getRelatedPosts('hello');
const adjacent = await blog.getAdjacentPosts('hello');
const rss      = await blog.generateRss({ title: 'My Blog', description: '…' });
const sitemap  = await blog.generateSitemap();
const llms     = await blog.generateLlmsTxt();
```

Custom typed frontmatter:

```ts
import { defineBlog, defaultSchema } from '@yamblog/core';
import { z } from 'zod';

export const blog = defineBlog({
  contentDir: 'content/posts',
  schema: defaultSchema.extend({
    videoUrl: z.string().url().optional(),
  }),
});
// posts are now typed with `videoUrl` included
```

> **Note:** `.mdx` files are picked up alongside `.md`, but content is rendered as plain markdown — JSX/MDX components are not executed.

## Examples

Runnable apps for each framework live in [`examples/`](examples):
[`with-next`](examples/with-next) · [`with-astro`](examples/with-astro) · [`with-react`](examples/with-react)

## Documentation

- Website: **[yamblog.dev](https://yamblog.dev)**
- [Getting started](https://yamblog.dev/getting-started/)
- [Architecture](docs/architecture.md) · [Extensibility](docs/extensibility.md) · [AI-agent authoring](docs/ai-agent-authoring.md) · [llms.txt](docs/llms-txt.md)
- Recipes: [Next.js](docs/recipes/nextjs.md) · [Astro](docs/recipes/astro.md) · [React](docs/recipes/react.md) · [Custom fields](docs/recipes/custom-fields.md)

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup and workflow, and [RELEASING.md](RELEASING.md) for how releases are published.

## License

[MIT](LICENSE) © [Bharat Parsiya](https://bnap.dev)
