---
title: "Hello World"
date: "2026-05-01"
author: "Your Name"
tags: ["general", "intro"]
excerpt: "My first post powered by Yamblog — a blogging platform for the agentic AI era."
featured: true
draft: false
---

# Hello World

Welcome to my blog, powered by **Yamblog**.

This is the first post in this example. Yamblog is a lightweight, framework-agnostic blog engine built for the agentic AI era. It gives you:

- **Stable blog IDs** you can wire into comments, analytics, or related-content services
- **Built-in searchability** — frontmatter metadata, RSS, sitemap, JSON-LD, and OpenGraph out of the box
- **Dead simple DX** — drop a markdown file in `src/content/posts/`, get a blog post

## How it works

Every `.md` file in your content directory becomes a post. Frontmatter drives the metadata. The core API is just:

```ts
const blog = createBlog({ contentDir: 'src/content/posts' });
const posts = await blog.getPosts();
```

No CMS, no magic, no forced design system.
