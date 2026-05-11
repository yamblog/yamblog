---
title: "Getting Started with Yamblog"
date: "2026-05-05"
author: "Your Name"
tags: ["tutorial", "nextjs"]
excerpt: "A step-by-step guide to installing and configuring Yamblog in a Next.js App Router project."
draft: false
---

# Getting Started with Yamblog

This guide walks you through installing Yamblog in an existing Next.js project using the App Router.

## Install

```bash
npm install @yamblog/core @yamblog/next
```

## Create your content directory

Add markdown files to `content/posts/`. Each file becomes a post, and the filename becomes the slug.

## Initialize the blog

```ts
// lib/blog.ts
import { createBlog } from '@yamblog/core';
import path from 'path';

export const blog = createBlog({
  contentDir: path.join(process.cwd(), 'content/posts'),
});
```

## Add routes

Create `app/blog/page.tsx` for the listing and `app/blog/[slug]/page.tsx` for individual posts.

## Enable RSS and sitemap

```ts
// app/feed.xml/route.ts
import { createRssHandler } from '@yamblog/next';
import { blog } from '@/lib/blog';

export const GET = createRssHandler(blog, {
  siteUrl: 'https://example.com',
  title: 'My Blog',
  description: 'Latest posts',
});
```

That's all it takes to get a fully searchability-optimised blog running.
