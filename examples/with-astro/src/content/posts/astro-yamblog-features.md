---
title: "What Yamblog Brings to Astro"
date: "2026-05-08"
author: "Your Name"
tags: ["astro", "features"]
excerpt: "RSS, sitemap, related posts, search, adjacent navigation — all built in."
draft: false
---

# What Yamblog Brings to Astro

Yamblog's core package provides everything you'd otherwise have to build yourself:

## Query API

```ts
import { createBlog } from '@yamblog/core';

const blog = createBlog({ contentDir: 'src/content/posts' });

const posts    = await blog.getPosts();
const featured = await blog.getFeaturedPosts();
const related  = await blog.getRelatedPosts('hello-world');
const adjacent = await blog.getAdjacentPosts('hello-world');
const results  = await blog.search('astro tutorial');
```

## RSS & Sitemap

```ts
const rss     = await blog.generateRss({ siteUrl, title, description });
const sitemap = await blog.generateSitemap({ siteUrl });
```

## Stable IDs

Every post has a stable `id` field (`"blog-{slug}"`) you can wire into comments, analytics, or any external service.
