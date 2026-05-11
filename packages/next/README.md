# @yamblog/next

Next.js adapter for `@yamblog/core`. Metadata, JSON-LD, RSS, sitemap, OG images, and pre-built page components for the App Router.

## Install

```bash
npm install @yamblog/core @yamblog/next
```

## Setup

```ts
// lib/blog.ts
import { createBlog } from '@yamblog/core';
export const blog = createBlog({ contentDir: 'content/posts' });
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
```

## App Router usage

### Blog listing page

```tsx
// app/blog/page.tsx
import { BlogListPage } from '@yamblog/next';
import { blog } from '@/lib/blog';

export default async function Page({ searchParams }) {
  const { q } = await searchParams;
  const posts = q ? await blog.search(q) : await blog.getPosts();
  return <BlogListPage posts={posts} query={q} />;
}
```

### Post detail page

```tsx
// app/blog/[slug]/page.tsx
import { BlogPostPage } from '@yamblog/next';
import { generatePostMetadata, generateBlogJsonLd } from '@yamblog/next';
import { createStaticParams } from '@yamblog/next';
import { blog, SITE_URL } from '@/lib/blog';

export async function generateStaticParams() {
  return createStaticParams(blog);
}

export async function generateMetadata({ params }) {
  const post = await blog.getPostBySlug((await params).slug);
  return generatePostMetadata(post, { siteUrl: SITE_URL });
}

export default async function Page({ params }) {
  const post = await blog.getPostBySlug((await params).slug);
  const adjacent = await blog.getAdjacentPosts(post.slug);
  const related  = await blog.getRelatedPosts(post.slug);
  const jsonLd   = generateBlogJsonLd(post, { siteUrl: SITE_URL });
  return <BlogPostPage post={post} adjacent={adjacent} related={related} jsonLd={jsonLd} />;
}
```

### RSS feed

```ts
// app/feed.xml/route.ts
import { createRssHandler } from '@yamblog/next';
import { blog, SITE_URL } from '@/lib/blog';
export const GET = createRssHandler(blog, { siteUrl: SITE_URL, title: 'My Blog', description: '...' });
```

### Sitemap

```ts
// app/sitemap.ts
import { createSitemapExport } from '@yamblog/next';
import { blog, SITE_URL } from '@/lib/blog';
export default createSitemapExport(blog, { siteUrl: SITE_URL });
```

### OG image

```ts
// app/blog/[slug]/opengraph-image/route.tsx
import { createOgImageHandler } from '@yamblog/next';
import { blog } from '@/lib/blog';
export const GET = createOgImageHandler(blog, { siteName: 'My Blog' });
```

### Breadcrumb JSON-LD

```ts
import { generateBreadcrumbJsonLd } from '@yamblog/next';

const breadcrumbs = generateBreadcrumbJsonLd([
  { name: 'Home', url: 'https://example.com' },
  { name: 'Blog', url: 'https://example.com/blog' },
  { name: post.title, url: `https://example.com/blog/${post.slug}` },
]);
```

## API

| Export | Description |
|--------|-------------|
| `BlogListPage` | Pre-built listing component with search |
| `BlogPostPage` | Pre-built post detail component (markdown, prev/next, related) |
| `generatePostMetadata(post, opts)` | Next.js `Metadata` with OpenGraph + Twitter cards |
| `generateBlogJsonLd(post, opts)` | JSON-LD `Article` schema |
| `generateBreadcrumbJsonLd(items)` | JSON-LD `BreadcrumbList` schema |
| `createStaticParams(blog)` | `generateStaticParams` helper returning `{ slug }[]` |
| `createRssHandler(blog, opts)` | Route handler for RSS feed |
| `createSitemapExport(blog, opts)` | Next.js sitemap export |
| `createOgImageHandler(blog, opts)` | Route handler for OG images via `@vercel/og` |
