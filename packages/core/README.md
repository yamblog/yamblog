# @yamblog/core

Framework-agnostic markdown blog engine. File-based, type-safe, zero-config.

## Install

```bash
npm install @yamblog/core
```

## Quick start

```ts
import { createBlog } from '@yamblog/core';

const blog = createBlog({ contentDir: './content/posts' });

const posts    = await blog.getPosts();
const post     = await blog.getPostBySlug('hello-world');
const results  = await blog.search('typescript');
const related  = await blog.getRelatedPosts('hello-world');
const adjacent = await blog.getAdjacentPosts('hello-world');
const rss      = await blog.generateRss({ siteUrl, title, description });
const sitemap  = await blog.generateSitemap({ siteUrl });
const index    = await blog.generateSearchIndex(); // lightweight JSON for client search
```

## Content validation

Use the same parser and schema checks in CI, a build step, or a Git hook:

```ts
import { validateContent } from '@yamblog/core';

await validateContent({
  contentDir: './content/posts',
});
```

If you already create a blog instance, you can validate through that too:

```ts
import { createBlog } from '@yamblog/core';

const blog = createBlog({ contentDir: './content/posts' });
await blog.validateContent();
```

Both forms throw when:

- the content directory does not exist
- a markdown file has invalid frontmatter
- two files resolve to the same slug

## Frontmatter schema

```yaml
---
title: "Post Title"
slug: "post-title"
date: "2026-01-15"
author: "Author Name"
tags: ["tag1", "tag2"]
excerpt: "One or two sentence summary."
published: true
---
```

Computed fields added automatically: `id` (`"blog-{slug}"`), `readingTime`, `content`.

## Custom schema

```ts
import { createBlog } from '@yamblog/core';
import { z } from 'zod';

const blog = createBlog({
  contentDir: './content/posts',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});
```

## API

| Method | Returns |
|--------|---------|
| `getPosts()` | All published posts, sorted newest first |
| `getPostBySlug(slug)` | Single post (throws if not found) |
| `getPostsByCategory(cat)` | Posts filtered by category |
| `getPostsByTag(tag)` | Posts filtered by tag |
| `getFeaturedPosts()` | Posts where `featured: true` |
| `getCategories()` | Unique category strings |
| `getTags()` | Unique tag strings |
| `search(query)` | Full-text search (title › excerpt › content) |
| `getAdjacentPosts(slug)` | `{ prev, next }` for navigation |
| `getRelatedPosts(slug)` | Related posts by tags/category |
| `generateRss(options)` | RSS 2.0 XML string |
| `generateSitemap(options)` | Sitemap XML string |
| `generateSearchIndex()` | Lightweight JSON array for client-side search |

## Stable blog ID

Every post exposes `post.id = "blog-{slug}"` — a stable foreign key you can wire into comments, analytics, or related-content services without worrying about it changing.
