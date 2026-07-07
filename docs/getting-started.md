---
title: Getting Started
description: Install Yamblog and write your first post in five minutes.
---

Yamblog is a file-based, type-safe, framework-agnostic markdown blog engine.
Write posts as `.md` files. Get a fully-featured blog. No database, no CMS.

## Install

Pick the adapter for your framework:

```bash
# Next.js
npm install @yamblog/core @yamblog/next

# Astro
npm install @yamblog/core @yamblog/astro

# React (Vite / CRA)
npm install @yamblog/core @yamblog/react
```

If you want an LLM to do the integration for you, use the dedicated
[Prompt for LLMs](./prompt-for-llms.md) guide instead of improvising a one-line install request.

## Create your first post

Posts live in a directory of your choice — `content/posts/` is the convention:

```
content/
  posts/
    hello-world.md
```

Every post needs a frontmatter block:

```markdown
---
title: "Hello, World!"
date: "2026-01-15"
author: "Your Name"
tags: ["intro"]
excerpt: "My very first post."
draft: false
---

Welcome to my blog! This is the body of the post in **markdown**.
```

Required fields: `title`, `date`.
Optional but recommended: `author`, `tags`, `excerpt`, `draft`.

The `slug` is derived from the filename and sanitized into a URL-safe form —
`hello-world.md` becomes `/blog/hello-world`, and `My Post.md` becomes `/blog/my-post`.
Do not put `slug` in frontmatter; it is a system field.

## Create a blog instance

```typescript
// lib/blog.ts
import { createBlog } from '@yamblog/core';

export const blog = createBlog({
  contentDir: './content/posts',
});
```

`createBlog` returns a `Blog` object. All methods return Promises and are safe
to call in parallel — results are cached after the first load. In development
(`NODE_ENV=development`) the cache is skipped, so content edits show up without
restarting the dev server.

Useful options:

```typescript
export const blog = createBlog({
  contentDir: './content/posts',
  siteUrl: 'https://example.com', // base for RSS / sitemap / JSON-LD links
  basePath: '/blog',              // URL prefix where posts are served (default '/blog', '' for site root)
  includeDrafts: false,           // set true to preview posts marked draft: true
});
```

## Query your posts

```typescript
const posts    = await blog.getPosts();           // all published posts
const post     = await blog.getPostBySlug('hello-world');  // throws if missing
const maybe    = await blog.findPostBySlug('hello-world'); // null if missing
const featured = await blog.getFeaturedPosts();
const tags     = await blog.getTags();
const results  = await blog.search('hello');
```

## Extend the schema

Use Zod to add custom frontmatter fields:

```typescript
import { createBlog } from '@yamblog/core';
import { z } from 'zod';

const blog = createBlog({
  contentDir: './content/posts',
  schema: z.object({
    title:      z.string(),
    date:       z.coerce.date(),
    author:     z.string().default('Anonymous'),
    tags:       z.array(z.string()).default([]),
    excerpt:    z.string().optional(),
    draft:      z.boolean().default(false),
    coverImage: z.string().optional(),
    featured:   z.boolean().default(false),
    category:   z.string().optional(),
  }),
});
```

## Next steps

- [Architecture overview](./architecture.md) — how the packages fit together
- [Next.js recipe](./recipes/nextjs.md) — App Router integration
- [Astro recipe](./recipes/astro.md) — Content Layer integration
- [React recipe](./recipes/react.md) — Vite SPA integration
- [Extensibility](./extensibility.md) — stable IDs, comments, analytics
- [AI agent authoring](./ai-agent-authoring.md) — agent-first workflow
- [Prompt for LLMs](./prompt-for-llms.md) — copy-paste integration prompt for coding agents
