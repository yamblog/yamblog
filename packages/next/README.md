# @yamblog/next

[![npm](https://img.shields.io/npm/v/%40yamblog%2Fnext)](https://www.npmjs.com/package/@yamblog/next) [![downloads](https://img.shields.io/npm/dm/%40yamblog%2Fnext)](https://www.npmjs.com/package/@yamblog/next)

Next.js adapter for `@yamblog/core`. Metadata, JSON-LD, RSS, sitemap, OG images, and pre-built page components for the App Router.

## Install

```bash
npm install @yamblog/core @yamblog/next
```

Peer dependencies: `next`, `react` and `react-dom` from your app. The package ships unbundled ES modules, so the components use your app's own React and `next/link`.

## Setup

```ts
// lib/blog.ts
import { createBlog } from '@yamblog/core';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const blog = createBlog({ contentDir: 'content/posts', siteUrl: SITE_URL });
```

## App Router usage

### Blog listing page

```tsx
// app/blog/page.tsx
import { BlogListPage } from '@yamblog/next';
import { blog } from '@/lib/blog';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const posts = q ? await blog.search(q) : await blog.getPosts();
  return <BlogListPage posts={posts} query={q} />;
}
```

### Post detail page

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import {
  BlogPostPage,
  createStaticParams,
  generateBlogJsonLd,
  generatePostMetadata,
} from '@yamblog/next';
import { blog, SITE_URL } from '@/lib/blog';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return createStaticParams(blog);
}

export async function generateMetadata({ params }: Props) {
  const post = await blog.findPostBySlug((await params).slug);
  if (!post) notFound();
  return generatePostMetadata(post, {
    siteUrl: SITE_URL,
    siteName: 'My Blog',
    // Opt-in: reference the OG image route below (see "OG image").
    ogImage: `/blog/${post.slug}/opengraph-image`,
  });
}

export default async function Page({ params }: Props) {
  const post = await blog.findPostBySlug((await params).slug);
  if (!post) notFound();
  const adjacent = await blog.getAdjacentPosts(post.slug);
  const related = await blog.getRelatedPosts(post.slug);
  const jsonLd = generateBlogJsonLd(post, { siteUrl: SITE_URL });
  return <BlogPostPage post={post} adjacent={adjacent} related={related} jsonLd={jsonLd} />;
}
```

`BlogPostPage` props:

| Prop | Description |
|------|-------------|
| `post` | The post to render (required) |
| `adjacent` | `{ prev, next }` from `blog.getAdjacentPosts(slug)` |
| `prev` / `next` | Individual neighbours; take precedence over `adjacent` |
| `related` | Posts listed under "Related posts" |
| `jsonLd` | Object or array rendered as `<script type="application/ld+json">`, with `<`, `>` and `&` escaped |
| `basePath` | Link prefix. Default `/blog` |
| `remarkPlugins` / `rehypePlugins` / `components` | Forwarded to `react-markdown` |

`BlogListPage` props: `posts`, `query?` (shows the result count and a Clear link), `basePath?` (default `/blog`).

Dates are formatted in UTC (`January 15, 2024`), so a date-only frontmatter value shows the same day on every server and in the browser.

### RSS feed

```ts
// app/feed.xml/route.ts
import { createRssHandler } from '@yamblog/next';
import { blog, SITE_URL } from '@/lib/blog';

export const GET = createRssHandler(blog, {
  siteUrl: SITE_URL,
  title: 'My Blog',
  description: 'Posts about things',
});
```

`title` and `description` are required; `siteUrl` falls back to the blog's configured `siteUrl`.

### Sitemap

```ts
// app/sitemap.ts
import { createSitemapExport } from '@yamblog/next';
import { blog, SITE_URL } from '@/lib/blog';

export default createSitemapExport(blog, { siteUrl: SITE_URL });
```

### OG image

```tsx
// app/blog/[slug]/opengraph-image/route.tsx
import { createOgImageHandler } from '@yamblog/next';
import { blog } from '@/lib/blog';

export const GET = createOgImageHandler(blog, { siteName: 'My Blog' });
```

This is an ordinary route handler at `/blog/<slug>/opengraph-image`, not Next's `opengraph-image.tsx` file convention, so Next does not link it for you. Pass its URL as `ogImage` to `generatePostMetadata` (as in the post page above) to emit `og:image` and `twitter:image`. An unknown slug returns `404 Not found`. Options: `width` (1200), `height` (630), `siteName`, `render(post)` for a custom layout.

### Breadcrumb JSON-LD

```ts
import { generateBreadcrumbJsonLd } from '@yamblog/next';

const breadcrumbs = generateBreadcrumbJsonLd([
  { name: 'Home', url: 'https://example.com' },
  { name: 'Blog', url: 'https://example.com/blog' },
  { name: post.title, url: `https://example.com/blog/${post.slug}` },
]);
```

When rendering JSON-LD yourself, escape `<` so a post title cannot close the script tag:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, '\\u003c') }}
/>
```

## Entry points

Everything is exported from `@yamblog/next`. Smaller entry points let a route load only what it uses (for example, a feed route does not need `@vercel/og` or `react-markdown`):

| Import | Exports |
|--------|---------|
| `@yamblog/next/components` | `BlogListPage`, `BlogPostPage` |
| `@yamblog/next/metadata` | `generatePostMetadata`, `generateBlogJsonLd`, `generateBreadcrumbJsonLd` |
| `@yamblog/next/og` | `createOgImageHandler` |
| `@yamblog/next/rss` | `createRssHandler` |
| `@yamblog/next/sitemap` | `createSitemapExport` |
| `@yamblog/next/params` | `createStaticParams` |

`@vercel/og` loads through a bundler (as Next.js does). Scripts that run under plain Node should import from the smaller entry points rather than the package root, which also loads `@vercel/og`.

## API

| Export | Description |
|--------|-------------|
| `BlogListPage` | Pre-built listing component with search form |
| `BlogPostPage` | Pre-built post detail component (markdown, prev/next, related, JSON-LD) |
| `generatePostMetadata(post, opts?)` | Next.js `Metadata` with OpenGraph and Twitter cards. `opts`: `{ siteUrl?, siteName?, basePath?, ogImage?, useCoverImage? }`. Without `siteUrl`, URLs are root-relative and resolved by Next's `metadataBase`. Images are only emitted when `ogImage` is set or `useCoverImage: true` |
| `generateBlogJsonLd(post, opts?)` | JSON-LD `Article` schema. `opts`: `{ siteUrl?, basePath? }` |
| `generateBreadcrumbJsonLd(items)` | JSON-LD `BreadcrumbList` schema |
| `createStaticParams(blog)` | `generateStaticParams` helper returning `{ slug }[]` |
| `createRssHandler(blog, opts)` | Route handler for the RSS feed. `opts` are core's `RssOptions` (`title`, `description` required) |
| `createSitemapExport(blog, opts?)` | Next.js sitemap export; uses the blog's `siteUrl` and `basePath` unless overridden |
| `createOgImageHandler(blog, opts?)` | Route handler for OG images via `@vercel/og`; 404 for unknown slugs |
