---
title: "Yamblog as an AI Agent Skill"
date: "2026-05-08"
author: "Your Name"
tags: ["ai", "agents", "workflow"]
excerpt: "How AI agents can author and publish blog posts using Yamblog's stable primitives."
draft: false
---

# Yamblog as an AI Agent Skill

Yamblog is designed to be used by AI agents as a first-class authoring workflow. The core primitives — stable slugs, predictable frontmatter, and a clean API — make it easy for an agent to create, validate, and publish posts without any manual intervention.

## Agent authoring workflow

1. **Decide slug and title** — derive a stable, URL-safe slug from the title
2. **Write frontmatter** — populate all required fields
3. **Write body** — compose markdown with proper heading hierarchy
4. **Validate** — call `blog.getPostBySlug(slug)` to confirm the post parses correctly
5. **Publish** — set `draft: false` in frontmatter

## Stable blog IDs

Every post gets a stable `id` — `blog-{slug}` — that you can pass into external services:

```ts
const post = await blog.getPostBySlug('my-post');
console.log(post.id); // "blog-my-post"

// Wire into a comments service
commentsService.getThread(post.id);

// Wire into analytics
analytics.track('page_view', { blogId: post.id });
```

This stable identifier is the extensibility hook that connects Yamblog to the rest of your stack.
