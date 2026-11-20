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

`import.meta.env.SITE` is the `site` option from `astro.config.mjs`. Set `site` to
your absolute production URL: without it the RSS feed, sitemap and JSON-LD contain
relative links, which feed readers reject.

**Zero-config:** `defineBlog()` with no arguments defaults to `src/content/posts` and
auto-detects the site URL from the process environment: `SITE`, `PUBLIC_SITE_URL`,
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_URL`, then on Vercel
`VERCEL_PROJECT_PRODUCTION_URL` (production deployments only) or `VERCEL_URL`
(checked in that order). Astro's `site` config is not one of these, so prefer
passing `import.meta.env.SITE` explicitly as above.

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
import { blog } from '../../lib/blog';

const posts = await blog.getPosts();
---

<BlogListPage posts={posts} title="Blog" />
```

`BlogListPage` props: `posts`, `query?` (shown in the search box), `basePath?`
(default `/blog`) and `title?` (default `Blog`). Its search form submits `?q=`, which
only filters results on an on-demand page; see [Search](#5-search).

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
        {post.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
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

`BlogPostPage` props:

| Prop | Type | Notes |
| --- | --- | --- |
| `post` | `Post` | required |
| `adjacent` | `AdjacentPosts` | `{ prev, next }` from `blog.getAdjacentPosts(slug)` |
| `basePath` | `string` | link prefix, default `/blog` |
| `jsonLd` | `Record<string, unknown>` | rendered as `<script type="application/ld+json">`, escaped so `</script>` in a title cannot break out |
| `sanitize` | `boolean` | default `false`. The body is rendered with `toHtml`, which passes raw HTML through; set `sanitize` when post content is not fully trusted |

Dates are shown in UTC, so a date-only `date: 2026-01-15` shows as January 15 on
every build machine. See [Security and content trust](../security.md) for what
`sanitize` removes.

### Building your own post layout

Use `toHtml` from `@yamblog/remark` for full pipeline control — compose any
`@yamblog/remark` plugins and rehype transforms. `toHtml` passes raw HTML through by
default; add `sanitize: true` when authors are not fully trusted. JSON-LD goes
through `serializeJsonLd` so a `</script>` in a title cannot break out of the tag:

```astro
---
import { buildPostUrl, serializeJsonLd } from '@yamblog/core';
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
  // ids: true gives headings ids that match the TOC links
  remarkPlugins: [remarkEmbed, [remarkToc, { ids: true }]],
  sanitize: true,
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

<script type="application/ld+json" set:html={serializeJsonLd(jsonLd)} />

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

### Server-side (on-demand rendering only)

`Astro.url.searchParams` is only populated when the page is rendered per request.
In Astro's default static output the page is prerendered once without a query, so
the form would just reload the full list. Server-side search needs an
[adapter](https://docs.astro.build/en/guides/on-demand-rendering/) (Node, Vercel,
Netlify, …) and `export const prerender = false` on the page:

```astro
---
// src/pages/blog/index.astro
import { blog } from '../../lib/blog';

export const prerender = false;

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
This works in static output. `clientSearch` from `@yamblog/react` accepts these
index entries directly if you use React islands.

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
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
```

In static output this endpoint is written to `dist/feed.xml` at build time and
response headers are discarded; set caching on your host instead. Headers such as
`Cache-Control` only apply when the endpoint is rendered on demand.

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
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
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
import { buildPostUrl, serializeJsonLd } from '@yamblog/core';
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

<script type="application/ld+json" set:html={serializeJsonLd(jsonLd)} />
```

Pass it to `BlogPostPage` via the `jsonLd` prop (the component escapes it), or inject
it yourself as above. Never use `set:html={JSON.stringify(jsonLd)}`: `JSON.stringify`
does not escape `<`, so a title containing `</script>` would end the script element
and inject markup. If your installed `@yamblog/core` predates `serializeJsonLd`, use
`JSON.stringify(jsonLd).replace(/</g, '\\u003c')`.

---

## 10. Custom markdown pipeline

`toHtml` from `@yamblog/remark` runs the unified pipeline and accepts any remark/rehype plugins:

```astro
---
import { toHtml, remarkToc, remarkEmbed, remarkInteractive } from '@yamblog/remark';
import remarkDirective from 'remark-directive';

const html = await toHtml(post.content, {
  remarkPlugins: [
    [remarkToc, { heading: 'Contents', maxDepth: 4, ids: true }],
    remarkEmbed,
    remarkDirective,
    [remarkInteractive, { components: ['counter-demo'], output: 'element' }],
  ],
  sanitize: true,
});
---

<article class="prose" set:html={html} />
```

- `remarkToc` with `ids: true` gives every heading an `id` matching its TOC link.
  Without it, the TOC links have no targets unless you add `rehype-slug`.
- `remarkInteractive` with `components` only converts the directives you list;
  `output: 'element'` emits real elements, which survive `sanitize: true`.
- `sanitize: true` drops raw HTML and dangerous URLs. Leave it off only when every
  author is trusted. See [Security and content trust](../security.md).

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
  // relative to the project root, or an absolute path
  loader: yamblogLoader({ base: 'src/content/posts' }),
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

Loader options: `base` (required), `schema` (custom Zod schema) and `failOnError`
(default `false`: invalid frontmatter or a missing directory is logged and the build
keeps going; set `true` to fail the build. The default becomes `true` in the next
major). In `astro dev` the collection reloads when a
`.md`/`.mdx` file under `base` changes.

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
