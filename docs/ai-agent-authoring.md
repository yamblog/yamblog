---
title: AI Agent Authoring
description: Using Yamblog with AI agents — frontmatter reference and validation workflow.
---

# AI Agent Authoring

Yamblog is designed for AI agents as a first-class authoring workflow.
A post is just a markdown file with a YAML frontmatter block — trivial to generate,
validate, and update programmatically.

## What an agent can do

- Create a `.md` file in `content/posts/` with valid frontmatter
- Populate required and optional metadata fields
- Write the body in markdown with correct heading hierarchy
- Validate the post by calling `blog.getPostBySlug(slug)` — any parse error throws
- Update an existing post by editing frontmatter or body
- Set `draft: false` to publish, `draft: true` to unpublish

## Authoring steps

1. **Choose a slug** — derive a stable, URL-safe slug from the title.
   Rules: lowercase, hyphens, ASCII only. Example: `"How I Built X"` → `how-i-built-x`.

2. **Write frontmatter** — populate all required fields, plus optional ones as relevant:

   ```yaml
   ---
   title: "How I Built X"
   date: "2026-05-08"
   author: "Agent Name"
   tags: ["tutorial", "typescript"]
   excerpt: "A one-sentence summary used in listings and OpenGraph."
   draft: false
   ---
   ```

   Do not include `slug` in frontmatter — it is derived from the filename automatically.

3. **Write the body** — compose markdown. Start with `##` headings (not `#`, which
   duplicates the title). Keep paragraphs focused.

4. **Validate** — call the API to confirm parsing succeeds:

   ```typescript
   import { defineBlog } from '@yamblog/core';
   const blog = defineBlog('content/posts');
   const post = await blog.getPostBySlug('how-i-built-x');
   console.log(post.id, post.readingTime);
   ```

   If the frontmatter is invalid (wrong type, missing required field) this throws —
   fix the file and retry.

5. **Publish** — set `draft: false` (already set in step 2 if publishing immediately).

## Agent setup prompt

For a repo integration prompt that detects the framework, confirms platform support,
creates a sample post, and self-heals on bad first attempts, use
[Prompt for LLMs](./prompt-for-llms.md).

Copy-paste this into any AI coding agent to bootstrap Yamblog authoring inside an already-configured project:

```
Install and configure Yamblog:

1. Install packages
   npm install @yamblog/core @yamblog/next     # Next.js
   npm install @yamblog/core @yamblog/astro    # Astro
   npm install @yamblog/core @yamblog/react    # Vite React

2. Create the content directory
   mkdir -p content/posts
   Create content/posts/hello-world.md starting with this frontmatter block
   (no slug field — it is derived from the filename):
     ---
     title: "Hello World"
     date: "2026-05-01"
     author: "Your Name"
     tags: ["intro"]
     excerpt: "My first post."
     draft: false
     ---

3. Create the blog instance (lib/blog.ts)
   import { defineBlog } from "@yamblog/core";
   export const blog = defineBlog("content/posts");
   // siteUrl auto-detected from SITE / PUBLIC_SITE_URL / NEXT_PUBLIC_SITE_URL /
   // NEXT_PUBLIC_BASE_URL / VERCEL_URL

4. Wire routes (Next.js App Router example)
   app/blog/page.tsx          → blog.getPosts()
   app/blog/[slug]/page.tsx   → blog.getPostBySlug(slug)
   app/feed.xml/route.ts      → createRssHandler(blog, { title, description })
   app/sitemap.ts             → createSitemapExport(blog)

5. Verify
   npm run dev → open /blog
   npm run build → no type errors

6. Optional enhancements
   - OG image: createOgImageHandler in app/blog/[slug]/opengraph-image/route.ts
   - Breadcrumb JSON-LD: generateBreadcrumbJsonLd in post page
   - Static params: createStaticParams in generateStaticParams
   - Search index: blog.generateSearchIndex() → public/search-index.json
   - Wire post.id into comments / analytics service
```

## Frontmatter field reference

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `title` | yes | string | Post title, used in metadata and listings |
| `date` | yes | ISO 8601 string | Publication date |
| `author` | no | string | Defaults to `'Anonymous'` |
| `tags` | no | string[] | Defaults to `[]` |
| `excerpt` | no | string | Used in listings and OpenGraph description |
| `draft` | no | boolean | `true` hides the post; defaults to `false` |
| `featured` | no | boolean | Returned by `getFeaturedPosts()`; defaults to `false` |
| `category` | no | string | Used by `getPostsByCategory()` |
| `coverImage` | no | string | URL or path to cover image |

## Computed fields (do not add to frontmatter)

| Field | Value |
|-------|-------|
| `id` | `"blog-{slug}"` — stable foreign key |
| `slug` | Derived from filename — do not add to frontmatter |
| `readingTime` | Minutes at 200 WPM |
| `content` | Raw markdown body |

## Validation errors

Common mistakes and how to fix them:

| Error | Fix |
|-------|-----|
| `date` is not a valid date | Use ISO 8601 format: `"2026-01-15"` |
| `tags` is not an array | Use YAML array: `tags: ["a", "b"]` |
| `PostNotFoundError` (`Post not found: {slug}`) | Check the slug matches the sanitized filename (lowercase, dashes, minus `.md`); catch with `instanceof PostNotFoundError`, or use `findPostBySlug` which returns `null` |
| `Schema validation failed` | Check all required fields are present and typed correctly |
