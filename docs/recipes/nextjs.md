---
title: Next.js Guide
description: Full integration of @yamblog/core + @yamblog/next in a Next.js 15+ App Router project.
---

# Recipe — Next.js App Router

Full integration of `@yamblog/core` + `@yamblog/next` in a Next.js 15+ App Router
project. Examples use the async `params` / `searchParams` introduced in Next.js 15 —
on Next.js 14, read them as plain objects instead of awaiting.

## Install

```bash
npm install @yamblog/core @yamblog/next
```

## 1. Create the blog instance

```typescript
// lib/blog.ts
import { defineBlog } from '@yamblog/core';

export const blog = defineBlog('content/posts');
```

`defineBlog` auto-detects `siteUrl` from environment variables, checked in this
order: `SITE`, `PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_URL`, then on
Vercel `VERCEL_PROJECT_PRODUCTION_URL` (production deployments only) and `VERCEL_URL`
(preview deployments, which get their own per-deployment host).
`blog.siteUrl` is then available everywhere — no separate env var wrangling across files.
Set `NEXT_PUBLIC_SITE_URL` when your canonical domain differs from the Vercel
production domain, or when you deploy somewhere else.

## 2. Blog listing page

```typescript
// app/blog/page.tsx
import { BlogListPage } from '@yamblog/next';
import { blog } from '@/lib/blog';

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] : q; // repeated ?q= arrives as an array
  const posts = query ? await blog.search(query) : await blog.getPosts();

  return <BlogListPage posts={posts} query={query} />;
}
```

## 3. Post detail page

```typescript
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildPostUrl } from '@yamblog/core';
import {
  BlogPostPage,
  generatePostMetadata,
  generateBlogJsonLd,
  generateBreadcrumbJsonLd,
  createStaticParams,
} from '@yamblog/next';
import { blog } from '@/lib/blog';

export async function generateStaticParams() {
  return createStaticParams(blog);
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const post = await blog.findPostBySlug(slug);
  if (!post) return {};
  return generatePostMetadata(post, {
    siteUrl: blog.siteUrl,
    basePath: blog.basePath,
    siteName: 'My Blog',
    // Optional: point social previews at the OG route from step 6
    ogImage: `${blog.basePath}/${post.slug}/opengraph-image`,
  });
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await blog.findPostBySlug(slug);
  if (!post) notFound();

  const adjacent = await blog.getAdjacentPosts(slug);
  const related  = await blog.getRelatedPosts(slug);

  const jsonLd = generateBlogJsonLd(post, { siteUrl: blog.siteUrl, basePath: blog.basePath });
  // schema.org expects absolute URLs in breadcrumbs
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: blog.siteUrl || '/' },
    { name: 'Blog', url: `${blog.siteUrl}${blog.basePath}` },
    { name: post.title, url: buildPostUrl(blog.siteUrl, blog.basePath, post.slug) },
  ]);

  return (
    <BlogPostPage
      post={post}
      adjacent={adjacent}
      related={related}
      basePath={blog.basePath}
      jsonLd={[jsonLd, breadcrumbJsonLd]}
    />
  );
}
```

`BlogPostPage` props:

| Prop | Type | Notes |
| --- | --- | --- |
| `post` | `Post` | required |
| `adjacent` | `AdjacentPosts \| null` | `{ prev, next }` from `blog.getAdjacentPosts(slug)` |
| `prev` / `next` | `Post \| null` | override `adjacent` (an explicit `null` hides the link) |
| `related` | `Post[]` | shown under the post |
| `basePath` | `string` | link prefix, default `/blog` |
| `jsonLd` | `object \| object[] \| null` | rendered as `<script type="application/ld+json">` with `<`, `>` and `&` escaped |
| `remarkPlugins` / `rehypePlugins` / `components` | react-markdown options | forwarded to `react-markdown` |

`siteUrl` is optional in `generatePostMetadata` and `generateBlogJsonLd`. Without it
the URLs are root-relative and Next.js resolves them against `metadataBase` from your
root layout.

If you render JSON-LD yourself, never write `JSON.stringify(jsonLd)` into the script
tag: a post title containing `</script>` would break out of it. Use `serializeJsonLd`
from `@yamblog/core`:

```tsx
import { serializeJsonLd } from '@yamblog/core';

<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
```

See [Security and content trust](../security.md).

## 4. RSS feed

```typescript
// app/feed.xml/route.ts
import { createRssHandler } from '@yamblog/next';
import { blog } from '@/lib/blog';

export const GET = createRssHandler(blog, {
  title: 'My Blog',
  description: 'Latest posts',
});
```

`siteUrl` is read from `blog.siteUrl` automatically.

## 5. Sitemap

```typescript
// app/sitemap.ts
import { createSitemapExport } from '@yamblog/next';
import { blog } from '@/lib/blog';

export default createSitemapExport(blog);
```

## 6. OG image

```typescript
// app/blog/[slug]/opengraph-image/route.ts
import { createOgImageHandler } from '@yamblog/next';
import { blog } from '@/lib/blog';

export const GET = createOgImageHandler(blog, { siteName: 'My Blog' });
```

This is an ordinary route handler (unknown slugs get a `404`), not Next's
`opengraph-image.tsx` file convention, so Next does not add `og:image` by itself.
Link it from the post metadata with the `ogImage` option, as in step 3:

```typescript
generatePostMetadata(post, {
  siteUrl: blog.siteUrl,
  ogImage: `/blog/${post.slug}/opengraph-image`,
});
```

`ogImage` takes a URL string, `{ url, width?, height?, alt? }`, or an array of
either; root-relative URLs are resolved against `siteUrl`. To use each post's
`coverImage` frontmatter instead, pass `useCoverImage: true`. Without either option
no images are emitted.

## 7. remark plugins (optional)

`BlogPostPage` renders via `react-markdown`, which is safe by default (raw HTML is
shown as text). `@yamblog/remark` plugins work through its `remarkPlugins` prop, with
no `rehype-raw` needed:

```tsx
import { remarkToc, remarkEmbed } from '@yamblog/remark';

<BlogPostPage
  post={post}
  adjacent={adjacent}
  remarkPlugins={[remarkEmbed, [remarkToc, { ids: true }]]}
/>
```

`[remarkToc, { ids: true }]` also gives every heading an `id` that matches the TOC
links; without it the links need `rehype-slug` to have targets.

For a fully custom pipeline, use `toHtml` and render the result yourself. `toHtml`
passes raw HTML in the markdown through unchanged, so pass `sanitize: true` unless
every author is trusted (see [Security and content trust](../security.md)):

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { toHtml, remarkToc, remarkEmbed } from '@yamblog/remark';
import { blog } from '@/lib/blog';

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await blog.findPostBySlug(slug);
  if (!post) notFound();

  const html = await toHtml(post.content, {
    remarkPlugins: [remarkEmbed, [remarkToc, { ids: true }]],
    sanitize: true,
  });

  return (
    <main>
      <h1>{post.title}</h1>
      <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
```

## File layout

```
app/
  blog/
    page.tsx                    listing + search
    [slug]/
      page.tsx                  post detail + JSON-LD
      opengraph-image/route.ts  OG image
  feed.xml/route.ts             RSS
  sitemap.ts                    sitemap
content/posts/                  markdown files
lib/blog.ts                     blog instance
```

## Custom fields

Extend the default schema to add typed custom frontmatter fields. `next build` runs `tsc`, so type errors in pages are caught automatically.

See the [Custom Fields recipe](./custom-fields.md) for validation types, full examples, and type enforcement details.
