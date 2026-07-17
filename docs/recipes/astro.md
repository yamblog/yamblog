---
title: Astro Guide
description: Full integration of @yamblog/core + @yamblog/astro in an Astro 5+ project.
---

# Building a Complete Blog with Yamblog + Astro

This guide covers every feature of the yamblog ecosystem in an Astro 5 project:
listing, post detail, category pages, tag pages, search, related posts, RSS, sitemap, and JSON-LD.

## Install

```bash
npm install @yamblog/core @yamblog/astro @yamblog/remark
```

## Shared blog instance

Create a single instance and import it everywhere. Posts are cached after the first
filesystem read, so all pages share one I/O pass.

```ts
// src/lib/blog.ts
import { defineBlog } from '@yamblog/core';

export const blog = defineBlog('src/content/posts', import.meta.env.SITE);
```

That's it. `defineBlog(contentDir, siteUrl)` resolves the content dir relative to `cwd`,
and the site URL flows through to `generateRss` and `generateSitemap`
automatically — no need to repeat it at every call site.

**Zero-config:** `defineBlog()` with no arguments defaults to `src/content/posts` and
auto-detects the site URL from `SITE`, `PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_BASE_URL`, or `VERCEL_URL` (checked in that order).

**Full config:** pass an options object for schema, sorting, related posts, etc.:

```ts
import { defineBlog } from '@yamblog/core';
import { z } from 'zod';

export const blog = defineBlog({
  contentDir: 'src/content/posts',
  siteUrl: import.meta.env.SITE,
  schema: z.object({ title: z.string(), date: z.coerce.date(), /* ... */ }),
});
```

## File layout

```
src/
  content/
    posts/
      hello-world.md
  lib/
    blog.ts                   shared blog instance
  pages/
    blog/
      index.astro             listing
      [slug].astro            post detail
      category/
        [category].astro      category pages
      tag/
        [tag].astro           tag pages
    feed.xml.ts               RSS
    sitemap.xml.ts            sitemap
```

---

## 1. Listing page

### Using the pre-built component

```astro
---
// src/pages/blog/index.astro
import BlogListPage from '@yamblog/astro/components/BlogListPage.astro';
import { blog } from '../lib/blog';

const query = Astro.url.searchParams.get('q') ?? undefined;
const posts = query ? await blog.search(query) : await blog.getPosts();
---

<BlogListPage posts={posts} query={query} title="Blog" />
```

### Building your own listing

```astro
---
import { blog } from '../../lib/blog';

const posts = await blog.getPosts();
---

<main>
  {posts.map(post => (
    <article>
      <a href={`/blog/${post.slug}`}>
        <h2>{post.title}</h2>
      </a>
      <p class="meta">
        {post.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        · {post.readingTime} min read
        · {post.author}
      </p>
      {post.excerpt && <p>{post.excerpt}</p>}
      <div>
        {post.tags.map(tag => <a href={`/blog/tag/${tag}`}>{tag}</a>)}
      </div>
    </article>
  ))}
</main>
```

---

## 2. Post detail page

### Using the pre-built component

```astro
---
// src/pages/blog/[slug].astro
import BlogPostPage from '@yamblog/astro/components/BlogPostPage.astro';
import { buildPostUrl } from '@yamblog/core';
import { blog } from '../../lib/blog';

export async function getStaticPaths() {
  const posts = await blog.getPosts();
  return posts.map(post => ({ params: { slug: post.slug } }));
}

const { slug } = Astro.params;
const post     = await blog.getPostBySlug(slug!);
const adjacent = await blog.getAdjacentPosts(slug!);

const jsonLd = {
  '@context': 'https://schema.org',
  '@type':    'BlogPosting',
  headline:        post.title,
  description:     post.excerpt,
  datePublished:   post.date.toISOString(),
  author:          { '@type': 'Person', name: post.author },
  keywords:        post.tags.join(', '),
  url:             buildPostUrl(blog.siteUrl, blog.basePath, post.slug),
};
---

<BlogPostPage post={post} adjacent={adjacent} jsonLd={jsonLd} />
```

### Building your own post layout

Use `toHtml` from `@yamblog/remark` for full pipeline control — compose any
`@yamblog/remark` plugins and rehype transforms:

```astro
---
import { buildPostUrl } from '@yamblog/core';
import { blog } from '../../lib/blog';
import { toHtml, remarkToc, remarkEmbed } from '@yamblog/remark';

export async function getStaticPaths() {
  const posts = await blog.getPosts();
  return posts.map(post => ({ params: { slug: post.slug } }));
}

const { slug } = Astro.params;
const post     = await blog.getPostBySlug(slug!);
const adjacent = await blog.getAdjacentPosts(slug!);
const related  = await blog.getRelatedPosts(slug!);

const html = await toHtml(post.content, {
  remarkPlugins: [remarkToc, remarkEmbed],
});

const jsonLd = {
  '@context': 'https://schema.org',
  '@type':    'BlogPosting',
  headline:      post.title,
  description:   post.excerpt,
  datePublished: post.date.toISOString(),
  author:        { '@type': 'Person', name: post.author },
  url:           buildPostUrl(blog.siteUrl, blog.basePath, post.slug),
};
---

<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />

<article class="prose" set:html={html} />

{adjacent.prev && <a href={`/blog/${adjacent.prev.slug}`}>&larr; {adjacent.prev.title}</a>}
{adjacent.next && <a href={`/blog/${adjacent.next.slug}`}>{adjacent.next.title} &rarr;</a>}

<section>
  <h2>Related posts</h2>
  {related.map(r => (
    <a href={`/blog/${r.slug}`}>{r.title}</a>
  ))}
</section>
```

---

## 3. Category pages

```astro
---
// src/pages/blog/category/[category].astro
import { blog } from '../../../lib/blog';

export async function getStaticPaths() {
  const categories = await blog.getCategories();
  return categories.map(category => ({ params: { category } }));
}

const { category } = Astro.params;
const posts = await blog.getPostsByCategory(category!);
---

<h1>Category: {category}</h1>
<ul>
  {posts.map(post => (
    <li>
      <a href={`/blog/${post.slug}`}>{post.title}</a>
    </li>
  ))}
</ul>
```

---

## 4. Tag pages

```astro
---
// src/pages/blog/tag/[tag].astro
import { blog } from '../../../lib/blog';

export async function getStaticPaths() {
  const tags = await blog.getTags();
  return tags.map(tag => ({ params: { tag } }));
}

const { tag } = Astro.params;
const posts = await blog.getPostsByTag(tag!);
---

<h1>Tag: {tag}</h1>
<ul>
  {posts.map(post => (
    <li>
      <a href={`/blog/${post.slug}`}>{post.title}</a>
    </li>
  ))}
</ul>
```

---

## 5. Search

### Server-side (Astro SSR or query param)

```astro
---
// src/pages/blog/index.astro
import { blog } from '../../lib/blog';

const query = Astro.url.searchParams.get('q') ?? undefined;
const posts = query ? await blog.search(query) : await blog.getPosts();
---

<form method="GET">
  <input name="q" value={query} placeholder="Search posts..." />
  <button type="submit">Search</button>
</form>

{posts.map(post => (
  <a href={`/blog/${post.slug}`}>{post.title}</a>
))}
```

### Client-side search index

Expose a JSON endpoint and search in the browser:

```ts
// src/pages/search-index.json.ts
import type { APIRoute } from 'astro';
import { blog } from '../lib/blog';

export const GET: APIRoute = async () => {
  const index = await blog.generateSearchIndex();
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

Then fetch `/search-index.json` on the client and filter by `title`, `excerpt`, `tags`.

---

## 6. Featured posts

```astro
---
import { blog } from '../lib/blog';

const featured = await blog.getFeaturedPosts();
---

<section>
  <h2>Featured</h2>
  {featured.map(post => (
    <article>
      <a href={`/blog/${post.slug}`}>{post.title}</a>
      {post.coverImage && <img src={post.coverImage} alt={post.title} />}
    </article>
  ))}
</section>
```

Mark posts as featured in frontmatter:

```markdown
---
title: "My Best Post"
featured: true
---
```

---

## 7. RSS feed

```ts
// src/pages/feed.xml.ts
import type { APIRoute } from 'astro';
import { blog } from '../lib/blog';

export const GET: APIRoute = async () => {
  const xml = await blog.generateRss({
    title:       'My Blog',
    description: 'Latest posts from my blog',
    // Per the RSS 2.0 spec this should be an email — validators flag bare names
    author:      'you@example.com (Your Name)',
  });

  return new Response(xml, {
    headers: {
      'Content-Type':  'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
};
```

Add a `<link>` tag in your layout so browsers discover it:

```html
<link rel="alternate" type="application/rss+xml" title="My Blog" href="/feed.xml" />
```

---

## 8. Sitemap

```ts
// src/pages/sitemap.xml.ts
import type { APIRoute } from 'astro';
import { blog } from '../lib/blog';

export const GET: APIRoute = async () => {
  const xml = await blog.generateSitemap();

  return new Response(xml, {
    headers: {
      'Content-Type':  'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
};
```

---

## 9. JSON-LD (structured data)

There is no dedicated helper for this — the mapping from a `Post` to a JSON-LD
object is straightforward to write once in your own layout. Use `buildPostUrl`
(from `@yamblog/core`) for the URL so it always matches your configured
`basePath` and the links in your RSS feed and sitemap:

```astro
---
import { buildPostUrl } from '@yamblog/core';
import { blog } from '../../lib/blog';

// `post` comes from your page — getStaticPaths props or blog.getPostBySlug()
const jsonLd = {
  '@context': 'https://schema.org',
  '@type':    'BlogPosting',
  headline:        post.title,
  description:     post.excerpt,
  datePublished:   post.date.toISOString(),
  dateModified:    post.date.toISOString(),
  author:          { '@type': 'Person', name: post.author },
  keywords:        post.tags.join(', '),
  url:             buildPostUrl(blog.siteUrl, blog.basePath, post.slug),
  ...(post.coverImage && { image: post.coverImage }),
};
---

<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
```

Pass it to `BlogPostPage` via the `jsonLd` prop, or inject it yourself in your own layout.

---

## 10. Custom markdown pipeline

`toHtml` from `@yamblog/remark` runs the unified pipeline and accepts any remark/rehype plugins:

```astro
---
import { toHtml, remarkToc, remarkEmbed, remarkInteractive } from '@yamblog/remark';
import remarkDirective from 'remark-directive';

const html = await toHtml(post.content, {
  remarkPlugins: [
    [remarkToc, { heading: 'Contents', maxDepth: 4 }],
    remarkEmbed,
    remarkDirective,
    remarkInteractive,
  ],
});
---

<article class="prose" set:html={html} />
```

If you only need raw markdown (e.g., to pass to a different renderer), `post.content` is
the untransformed string — `toHtml` is opt-in.

---

## 11. Astro Content Layer (optional)

Everything above queries the shared `blog` instance directly. If you prefer
Astro's native content collections (`getCollection`, `getEntry`, typed
`astro:content` APIs), `@yamblog/astro` ships a Content Layer loader:

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { yamblogLoader } from '@yamblog/astro';

const blog = defineCollection({
  loader: yamblogLoader({ base: './src/content/posts' }),
});

export const collections = { blog };
```

```astro
---
import { getCollection } from 'astro:content';

const posts = await getCollection('blog');
---
```

The loader derives the collection schema from core's `defaultSchema` (or a
custom `schema` option you pass) and always adds the system fields (`id`,
`slug`, `content`, `readingTime`), so custom frontmatter fields stay typed in
Astro too. Both approaches read the same markdown files — pick whichever API
you prefer, or mix them (e.g. collections for pages, the `blog` instance for
RSS/sitemap endpoints).

---

## Frontmatter reference

```markdown
---
title:      "Post Title"          # required
date:       "2026-01-15"          # required
author:     "Your Name"           # default: Anonymous
tags:       ["astro", "blog"]     # default: []
excerpt:    "Short description"   # optional, used in listings + RSS
category:   "tutorials"           # optional, used in category pages
coverImage: "/images/cover.jpg"   # optional, used in featured/OG
featured:   true                  # default: false
draft:      true                  # default: false — drafts are excluded from getPosts()
---
```

## Custom fields

Extend the default schema to add typed custom frontmatter fields. Add `astro check` to your build script to enforce types in `.astro` templates:

```json
"build": "astro check && astro build"
```

See the [Custom Fields recipe](./custom-fields.md) for validation types and full examples.
