---
title: "How to Create a Blog for Your Project the Easy Way"
date: "2026-07-16"
author: "Bharat Parsiya"
authorWebpage: "https://bnap.dev"
tags: ["blogging", "best-practices", "markdown", "seo"]
excerpt: "You don't need a CMS, a database, or a weekend of setup. A practical checklist for adding a blog to any project — and the decisions that actually matter."
featured: true
draft: false
---

Most projects that need a blog never get one, because the perceived setup cost is a weekend and the perceived maintenance cost is forever. Both are wrong — if you make a few decisions correctly up front.

This post is the checklist I wish I'd had before building blog infrastructure for the fourth time. It applies whether you use Yamblog or roll your own.

## Decision 1: files, not a CMS

For a developer-run blog, markdown files in your repo beat a CMS on almost every axis:

- **Versioned with your code.** Posts go through the same pull requests, reviews, and rollbacks as everything else.
- **No extra infrastructure.** Nothing to host, back up, patch, or pay for.
- **Portable.** Move frameworks or hosts and your content moves with you — it's just files.
- **Editor-native.** You write in the same tool you code in, and AI assistants can read and write posts like any other file.

A CMS earns its keep when non-technical people publish daily. For a product blog, an engineering journal, or a personal site, it's overhead.

## Decision 2: treat frontmatter as a schema, not a suggestion

The classic failure mode of file-based blogs is frontmatter drift: one post has `tags`, another has `tag`, a third has a date in the wrong format, and your listing page crashes six months later.

The fix is validation at build time. Yamblog runs every post through a [Zod](https://zod.dev) schema when content loads:

```ts
import { defineBlog } from '@yamblog/core';

export const blog = defineBlog('content/posts');
```

A missing `title`, a malformed `date`, or a `tags: "typescript"` that should be an array fails the build with an error naming the file — not a blank page in production. If you're building your own, this is the single highest-value feature to copy.

## Decision 3: slugs come from filenames, and they're forever

A post's URL is its identity. Search engines, backlinks, and social shares all bind to it, so:

- derive slugs from filenames (`shipping-fast.md` → `/blog/shipping-fast`) — one obvious source of truth
- sanitize them (lowercase, dashes, no unsafe characters)
- never change them after publishing

Yamblog also computes a stable `id` (`blog-{slug}`) for every post, which you can hand to comment systems and analytics as a foreign key that survives even a URL migration.

## Decision 4: the "boring" outputs are the discoverability

Nobody gets excited about RSS and sitemaps, but they're how anyone — human or crawler — finds your writing without visiting daily:

```ts
const rss     = await blog.generateRss({ title: 'My Blog', description: 'Notes from the team' });
const sitemap = await blog.generateSitemap();
const llms    = await blog.generateLlmsTxt(); // the blog section of your llms.txt
```

RSS for readers and aggregators, a sitemap for search engines, [llms.txt](https://llmstxt.org) for AI assistants that increasingly answer questions your future users are asking. Generate all three from the same posts you already wrote — never maintain them by hand.

## Decision 5: make drafts safe by default

You want to preview unfinished posts locally without ever leaking them. The pattern that works: a `draft: true` flag that hides the post everywhere, plus an explicit opt-in for local preview:

```ts
export const blog = defineBlog({
  contentDir: 'content/posts',
  includeDrafts: process.env.NODE_ENV === 'development',
});
```

In Yamblog the public artifacts — RSS, sitemap, llms.txt, search index — exclude drafts *even when* `includeDrafts` is on, so a preview deployment can't accidentally publish them.

## The whole setup, concretely

With the decisions made, the actual work is small. Install the core plus the adapter for your framework, drop a markdown file in `content/posts/`, and wire two pages:

```md
---
title: "Hello World"
date: "2026-07-16"
tags: [intro]
excerpt: "First post."
---

Welcome!
```

```ts
const posts = await blog.getPosts();              // listing page
const post  = await blog.getPostBySlug('hello-world'); // detail page
```

Framework-specific walkthroughs: [Next.js](/recipes/nextjs/), [Astro](/recipes/astro/), and [React/Vite](/recipes/react/). Each is a genuinely short read, because once the engine handles parsing, validation, and generation, a blog is just two routes and a folder of files.
