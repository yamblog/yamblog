---
title: Next.js Guide
description: Full integration of @yamblog/core + @yamblog/next in a Next.js 14+ App Router project.
---

# Recipe — Next.js App Router

Full integration of `@yamblog/core` + `@yamblog/next` in a Next.js 14+ App Router project.

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

`defineBlog` auto-detects `siteUrl` from `NEXT_PUBLIC_BASE_URL` (or `VERCEL_URL`, `SITE`, `PUBLIC_SITE_URL`).
`blog.siteUrl` is then available everywhere — no separate env var wrangling across files.

## 2. Blog listing page

```typescript
// app/blog/page.tsx
import { BlogListPage } from '@yamblog/next';
import { blog } from '@/lib/blog';

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const posts = searchParams.q
    ? await blog.search(searchParams.q)
    : await blog.getPosts();

  return <BlogListPage posts={posts} query={searchParams.q} />;
}
```

## 3. Post detail page

```typescript
// app/blog/[slug]/page.tsx
import {
  BlogPostPage,
  generatePostMetadata,
  generateBlogJsonLd,
  generateBreadcrumbJsonLd,
  createStaticParams,
} from '@yamblog/next';
import { blog } from '@/lib/blog';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  return createStaticParams(blog);
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await blog.findPostBySlug(params.slug);
  if (!post) return {};
  return generatePostMetadata(post, { siteUrl: blog.siteUrl, basePath: blog.basePath, siteName: 'My Blog' });
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await blog.findPostBySlug(params.slug);
  if (!post) notFound();

  const adjacent = await blog.getAdjacentPosts(params.slug);
  const related  = await blog.getRelatedPosts(params.slug);

  const jsonLd = generateBlogJsonLd(post, { siteUrl: blog.siteUrl, basePath: blog.basePath });
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title, url: `/blog/${post.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <BlogPostPage
        post={post}
        prev={adjacent.prev}
        next={adjacent.next}
        related={related}
      />
    </>
  );
}
```

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

## 7. remark plugins (optional)

`BlogPostPage` renders via `react-markdown`. To use a custom pipeline with
`@yamblog/remark` plugins, use `toHtml` and render the result yourself:

```tsx
// app/blog/[slug]/page.tsx
import { toHtml, remarkToc, remarkEmbed } from '@yamblog/remark';

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await blog.findPostBySlug(params.slug);
  if (!post) notFound();

  const html = await toHtml(post.content, {
    remarkPlugins: [remarkToc, remarkEmbed],
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
