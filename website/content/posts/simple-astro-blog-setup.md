---
title: "Set Up a Markdown Blog in Astro in About Ten Minutes"
date: "2026-07-02"
author: "Bharat Parsiya"
authorWebpage: "https://bnap.dev"
tags: ["astro", "tutorial", "markdown", "blogging"]
excerpt: "From empty Astro project to a typed markdown blog with listing, post pages, RSS, and a sitemap — using @yamblog/astro and about forty lines of code."
draft: false
---

Astro is already the best-in-class tool for content sites, and this site you're reading runs on it. Here's the shortest honest path from an empty Astro project to a working blog: listing page, post pages, RSS, and a sitemap — with typed, validated frontmatter.

## Install

```bash
npm install @yamblog/core @yamblog/astro @yamblog/remark
```

(`zod` is a peer dependency; npm 7+, pnpm, and bun install it automatically.)

## One blog instance, imported everywhere

```ts
// src/lib/blog.ts
import { defineBlog } from '@yamblog/core';

export const blog = defineBlog('src/content/posts', import.meta.env.SITE);
```

Posts are cached after the first filesystem read, so every page shares one I/O pass. In dev, the cache refreshes when a file changes — edit a post and reload.

Then write your first post:

```md
<!-- src/content/posts/hello-world.md -->
---
title: "Hello World"
date: "2026-07-02"
tags: [intro]
excerpt: "My first post."
---

Welcome to my blog!
```

`title` and `date` are required; everything else is optional. The slug comes from the filename. If the frontmatter is malformed, the build fails with an error naming the file — that's the feature.

## Listing page

```astro
---
// src/pages/blog/index.astro
import BlogListPage from '@yamblog/astro/components/BlogListPage.astro';
import { blog } from '../../lib/blog';

const query = Astro.url.searchParams.get('q') ?? undefined;
const posts = query ? await blog.search(query) : await blog.getPosts();
---

<BlogListPage posts={posts} query={query} title="Blog" />
```

Full-text search included, no client-side JavaScript required. When you outgrow the pre-built component, `blog.getPosts()` gives you the typed array and you write your own markup — the [Astro recipe](/recipes/astro/) shows both styles.

## Post pages

```astro
---
// src/pages/blog/[slug].astro
import BlogPostPage from '@yamblog/astro/components/BlogPostPage.astro';
import { blog } from '../../lib/blog';

export async function getStaticPaths() {
  const posts = await blog.getPosts();
  return posts.map(post => ({ params: { slug: post.slug } }));
}

const { slug } = Astro.params;
const post     = await blog.getPostBySlug(slug!);
const adjacent = await blog.getAdjacentPosts(slug!);
---

<BlogPostPage post={post} adjacent={adjacent} />
```

You get the rendered markdown, reading time, tags, and previous/next navigation.

## RSS and sitemap

```ts
// src/pages/feed.xml.ts
import type { APIRoute } from 'astro';
import { blog } from '../lib/blog';

export const GET: APIRoute = async () => {
  const xml = await blog.generateRss({
    title: 'My Blog',
    description: 'Latest posts',
  });
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
```

```ts
// src/pages/sitemap.xml.ts
import type { APIRoute } from 'astro';
import { blog } from '../lib/blog';

export const GET: APIRoute = async () => {
  return new Response(await blog.generateSitemap(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
```

The site URL you passed to `defineBlog` flows into both — configure it once, never repeat it. Drafts (`draft: true`) are excluded from both automatically.

## Prefer Astro's content collections?

If you'd rather query posts through `astro:content`, the package ships a Content Layer loader:

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { yamblogLoader } from '@yamblog/astro';

const blog = defineCollection({
  loader: yamblogLoader({ base: './src/content/posts' }),
});

export const collections = { blog };
```

Same files, same validation — just exposed via `getCollection('blog')` with the system fields (`id`, `slug`, `readingTime`) typed in.

## Custom fields, still typed

Need a `videoUrl` or a `series` field? Extend the schema and it's typed end to end:

```ts
import { defineBlog, defaultSchema } from '@yamblog/core';
import { z } from 'zod';

export const blog = defineBlog({
  contentDir: 'src/content/posts',
  siteUrl: import.meta.env.SITE,
  schema: defaultSchema.extend({
    videoUrl: z.string().url().optional(),
  }),
});
```

Add `astro check` to your build script so `.astro` templates get type-checked too.

That's the whole setup — two pages, two endpoints, one config file. The [full Astro guide](/recipes/astro/) adds category pages, tag pages, related posts, and JSON-LD when you want them.
