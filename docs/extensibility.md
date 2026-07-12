---
title: Extensibility
description: Stable post IDs, comments, analytics, custom schema, and custom sort.
---

# Extensibility

## Stable post IDs

Every post has a stable `id` field computed from its slug:

```
id = "blog-{slug}"
```

For example, a post with slug `my-first-post` always has `id = "blog-my-first-post"`.

This ID is designed as a **foreign key** you can pass to any external service:

```typescript
const post = await blog.getPostBySlug('my-first-post');
console.log(post.id); // "blog-my-first-post"
```

The ID is stable across renames of the markdown file, changes to the title, or
re-ordering of posts. As long as the `slug` is unchanged, the ID is unchanged.

## Comments

Wire the stable ID into a comments backend (Giscus, Utterances, a custom API…):

```tsx
// Next.js
import Giscus from '@giscus/react';

<Giscus
  repo="your-org/your-repo"
  repoId="R_xxx"
  category="Announcements"
  categoryId="DIC_xxx"
  mapping="specific"
  term={post.id}   // ← stable foreign key
  reactionsEnabled="1"
  emitMetadata="0"
  theme="light"
/>
```

Using `post.id` instead of the URL means comments survive URL migrations.

## Analytics

Pass the post ID as a custom dimension or event property:

```typescript
// Google Analytics 4
gtag('event', 'page_view', {
  page_title: post.title,
  blog_post_id: post.id,
});

// PostHog
posthog.capture('blog_post_viewed', {
  post_id: post.id,
  post_slug: post.slug,
  post_title: post.title,
  post_tags: post.tags,
});
```

## Related content

Pass the post ID to an external related-content engine (Algolia, custom vector DB…):

```typescript
const relatedPostIds = await myRecommendationEngine.getRelated(post.id);
```

Or use the built-in algorithm:

```typescript
const blog = createBlog({
  contentDir: './content/posts',
  relatedPosts: { limit: 3, strategy: 'tags+category' },
});

const related = await blog.getRelatedPosts('my-first-post');
```

Strategies: `'tags'` (tag overlap only), `'category'` (same category only),
`'tags+category'` (combined, default).

## Search index export

Generate a JSON search index for a client-side search library (Fuse.js, Lunr, FlexSearch…):

```typescript
const index = await blog.generateSearchIndex();
// [{ id, slug, title, excerpt, tags, category, author, date, readingTime }, ...]

// Write to a static file for Vite to import, or serve as an API route
import { writeFileSync } from 'fs';
writeFileSync('public/search-index.json', JSON.stringify(index));
```

Client-side (Fuse.js example):

```typescript
import Fuse from 'fuse.js';

const response = await fetch('/search-index.json');
const index = await response.json();

const fuse = new Fuse(index, {
  keys: ['title', 'excerpt', 'tags'],
  threshold: 0.3,
});

const results = fuse.search('nextjs tutorial').map(r => r.item);
```

## Custom schema

Add your own frontmatter fields with full type safety:

```typescript
import { createBlog } from '@yamblog/core';
import { z } from 'zod';

const blog = createBlog({
  contentDir: './content/posts',
  schema: z.object({
    title:       z.string(),
    date:        z.coerce.date(),
    author:      z.string().default('Anonymous'),
    tags:        z.array(z.string()).default([]),
    excerpt:     z.string().optional(),
    draft:       z.boolean().default(false),
    // custom fields:
    coverImage:  z.string().optional(),
    featured:    z.boolean().default(false),
    series:      z.string().optional(),
    seriesPart:  z.number().optional(),
    canonicalUrl: z.string().url().optional(),
  }),
});

// Posts are now typed with your custom fields:
const post = await blog.getPostBySlug('my-post');
console.log(post.series);      // string | undefined
console.log(post.seriesPart);  // number | undefined
```

## Custom sort

```typescript
const blog = createBlog({
  contentDir: './content/posts',
  sortBy: (a, b) => {
    // featured posts first, then newest
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return b.date.getTime() - a.date.getTime();
  },
});
```

## Custom slug generator

By default, slugs are derived from filenames and sanitized into a URL-safe
form (`My Post.md` → `my-post`). Pass `slugify` to change this:

```typescript
const blog = createBlog({
  contentDir: './content/posts',
  slugify: (filename) => {
    // strip date prefix: "2026-01-15-hello-world.md" → "hello-world"
    return filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.mdx?$/, '');
  },
});
```

## Custom base path

RSS, sitemap, and llms.txt links default to `{siteUrl}/blog/{slug}`. If your
posts live somewhere else, set `basePath` (use `''` to mount at the site root):

```typescript
const blog = createBlog({
  contentDir: './content/posts',
  siteUrl: 'https://example.com',
  basePath: '/articles', // links become https://example.com/articles/{slug}
});
```

## Previewing drafts

Posts with `draft: true` are excluded from all queries. To preview them
locally, flip `includeDrafts` on in development:

```typescript
const blog = createBlog({
  contentDir: './content/posts',
  includeDrafts: process.env.NODE_ENV === 'development',
});
```

Generated public artifacts — RSS, sitemap, llms.txt, and the search index —
always exclude drafts, even with `includeDrafts` on, so a preview deployment
can't accidentally publish them. To include drafts in one of those outputs,
pass `includeDrafts: true` to that generator call explicitly:

```typescript
const rss = await blog.generateRss({ title: 'Preview', description: '…', includeDrafts: true });
```
