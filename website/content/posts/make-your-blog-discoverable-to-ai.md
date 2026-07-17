---
title: "Make Your Blog Discoverable to AI: llms.txt, Feeds, and Structure"
date: "2026-06-18"
author: "Bharat Parsiya"
authorWebpage: "https://bnap.dev"
tags: ["ai", "llms-txt", "seo", "blogging"]
excerpt: "Search engines aren't the only readers anymore. How to structure a blog so AI assistants can find it, cite it, and even help write it."
draft: false
---

A growing share of the people who would benefit from your writing will never see your website. They'll ask an AI assistant a question, and the assistant will answer — informed by whatever content it could find and parse. Whether your blog is part of that answer is now a discoverability problem, alongside classic SEO.

The good news: the things that make a blog legible to machines are cheap, standardized, and mostly generated. Here's the stack.

## 1. llms.txt — a front door for language models

[llms.txt](https://llmstxt.org) is a proposed standard: a markdown file at `yourdomain.com/llms.txt` that tells language models what your site is and where the important content lives. Think `robots.txt`, but describing rather than forbidding.

The format is simple — a name, a blockquote description, and link lists:

```md
# Acme

> We help developers ship software faster.

## Blog

- [Why we rewrote our queue](https://acme.com/blog/queue-rewrite): What broke and what we learned.
- [Getting started](https://acme.com/blog/getting-started): First project in five minutes.
```

Curation is the point — you're pointing models at your best material, not dumping a sitemap. Yamblog generates the blog section from your posts' frontmatter; by default it includes posts marked `featured: true`:

```ts
// app/llms.txt/route.ts (Next.js — Astro version is nearly identical)
import { blog } from '@/lib/blog';

export async function GET() {
  const section = await blog.generateLlmsTxt();
  const body = `# My Site\n\n> What this site is about.\n\n${section}`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

Want different curation? Pass a filter: `blog.generateLlmsTxt({ filter: p => p.tags.includes('guide') })`. Each entry uses the post's `excerpt` as its description — one more reason to write good excerpts.

## 2. RSS and sitemaps still matter — maybe more than ever

AI crawlers and answer engines discover content the same way feed readers and search engines always have: feeds and sitemaps. An RSS feed with real descriptions and correct dates is machine-readable syndication; a sitemap is the canonical index of what exists.

Both are one-liners once your content has structure:

```ts
const rss     = await blog.generateRss({ title: 'My Blog', description: 'Latest posts' });
const sitemap = await blog.generateSitemap();
```

The details matter for parsers, which is why the generated feed includes an atom self-link, `lastBuildDate`, and per-item GUIDs built from stable post IDs — the boring conformance stuff that determines whether an aggregator accepts your feed.

## 3. Structure beats prose for machine readers

Everything that makes content parseable by a machine comes down to predictable structure:

- **Frontmatter as metadata.** `title`, `date`, `tags`, `excerpt` in a validated schema mean every consumer — your own pages, feeds, JSON-LD, llms.txt — draws from the same facts.
- **One post, one file, one URL.** Slugs derived from filenames, never changed after publishing.
- **JSON-LD on post pages.** Structured `BlogPosting` data is how answer engines confirm authorship and dates. (`@yamblog/next` ships `generateBlogJsonLd`; the Astro recipe shows the equivalent.)
- **Honest excerpts.** They become your meta descriptions, feed summaries, and llms.txt entries. A vague excerpt wastes all three.

None of this requires writing differently. It requires the metadata to exist and be consistent — which is what schema validation quietly enforces on every build.

## 4. Let AI write for your blog, safely

Discoverability has a flip side: AI agents are increasingly the ones *producing* content, and most blog systems are hostile to them — write this in an admin panel, click that button. A file-based blog inverts this. For an agent, publishing is:

1. Create `content/posts/new-post.md` with frontmatter.
2. Run validation — invalid frontmatter throws with a precise error, so the agent can fix and retry:

```ts
import { defineBlog } from '@yamblog/core';

const blog = defineBlog('content/posts');
await blog.validateContent(); // throws on any invalid post
```

3. Open a pull request. A human reviews the diff like any other change.

That loop — generate, validate, review — is the safe version of AI-assisted publishing, and it works precisely because posts are code-reviewed files rather than rows in someone's database. There's a dedicated [agent authoring guide](/ai-agent-authoring/) and a copy-paste [integration prompt](/prompt-for-llms/) if you want to hand the whole setup to a coding agent.

## The checklist

For a blog that both humans and machines can find:

- `llms.txt` with a curated blog section
- RSS feed linked with `<link rel="alternate">`
- Sitemap submitted to search consoles
- JSON-LD on every post page
- Validated frontmatter with real excerpts
- Stable, sanitized, filename-derived URLs

With Yamblog each item is either automatic or a few lines — the [getting started guide](/getting-started/) covers the lot. The era where your most important reader might be a language model is already here; the fix is mostly good structure, and structure is cheap.
