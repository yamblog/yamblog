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
const post     = await blog.getPostBySlug('hello-world');  // throws if missing
const maybe    = await blog.findPostBySlug('hello-world'); // null if missing
const results  = await blog.search('typescript');
const related  = await blog.getRelatedPosts('hello-world');
const adjacent = await blog.getAdjacentPosts('hello-world');
const rss      = await blog.generateRss({ title: 'My Blog', description: 'Latest' });
const sitemap  = await blog.generateSitemap();
const llms     = await blog.generateLlmsTxt();
const index    = await blog.generateSearchIndex(); // lightweight JSON for client search
```

## Configuration

```ts
const blog = createBlog({
  contentDir: './content/posts', // required — directory of .md files
  siteUrl: 'https://example.com', // base for RSS / sitemap / llms.txt links
  basePath: '/blog',             // URL prefix where posts are served (default '/blog', '' for site root)
  includeDrafts: false,          // set true to preview posts marked draft: true
  schema: mySchema,              // custom Zod frontmatter schema
  sortBy: (a, b) => 0,           // custom sort (default: newest first)
  slugify: (filename) => '…',    // custom slug generator
  relatedPosts: { limit: 3 },    // related-posts strategy
});
```

Posts are loaded once and cached per blog instance. In development
(`NODE_ENV=development`) the cache is skipped so content edits show up
without restarting the dev server.

Slugs are derived from filenames and sanitized into a URL-safe form:
`My Post.md` → `my-post`. Pass a custom `slugify` to change this.

> **Note:** `.mdx` files are picked up alongside `.md`, but content is treated
> as plain markdown — JSX/MDX components are not executed.

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
date: "2026-01-15"
author: "Author Name"
tags: ["tag1", "tag2"]
category: "Guides"
excerpt: "One or two sentence summary."
coverImage: "/images/cover.png"
featured: false
draft: false
---
```

Required fields: `title`, `date`. Everything else is optional.
Do not put `slug` in frontmatter — it is derived from the filename.
Computed fields added automatically: `id` (`"blog-{slug}"`), `slug`, `readingTime`, `content`.

## Custom schema

```ts
import { createBlog, defaultSchema } from '@yamblog/core';
import { z } from 'zod';

const blog = createBlog({
  contentDir: './content/posts',
  schema: defaultSchema.extend({
    videoUrl: z.string().url().optional(),
  }),
});
// posts are now typed with `videoUrl` included
```

## API

| Method | Returns |
|--------|---------|
| `getPosts()` | All published posts, sorted newest first |
| `getPostBySlug(slug)` | Single post (throws if not found) |
| `findPostBySlug(slug)` | Single post, or `null` if not found |
| `getPostsByCategory(cat)` | Posts filtered by category |
| `getPostsByTag(tag)` | Posts filtered by tag |
| `getFeaturedPosts()` | Posts where `featured: true` |
| `getCategories()` | Unique category strings |
| `getTags()` | Unique tag strings |
| `search(query)` | Full-text search (title › excerpt › tags › content) |
| `getAdjacentPosts(slug)` | `{ prev, next }` for navigation |
| `getRelatedPosts(slug)` | Related posts by tags/category |
| `generateRss(options)` | RSS 2.0 XML string (atom self-link, lastBuildDate, configurable language) |
| `generateSitemap(options?)` | Sitemap XML string |
| `generateLlmsTxt(options?)` | `llms.txt` blog section markdown |
| `generateSearchIndex()` | Lightweight JSON array for client-side search |
| `validateContent()` | Parses everything, throws on invalid content |

## Stable blog ID

Every post exposes `post.id = "blog-{slug}"` — a stable foreign key you can wire into comments, analytics, or related-content services without worrying about it changing.
