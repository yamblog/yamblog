---
title: "A Headless Markdown Blog for Next.js, Deployed on Vercel"
date: "2026-06-25"
author: "Bharat Parsiya"
authorWebpage: "https://bnap.dev"
tags: ["nextjs", "vercel", "tutorial", "headless-cms", "blogging"]
excerpt: "Skip the headless CMS subscription. Markdown files in your repo, typed queries in the App Router, SEO metadata, RSS, sitemap, and OG images — deployed with git push."
draft: false
---

"Headless CMS" usually means: your content lives in someone else's database, arrives over someone else's API, and costs a subscription once you pass the free tier. For a developer-run blog there's a simpler headless architecture — the content layer is a folder of markdown files, and the API is a typed library call.

Here's the full setup for Next.js App Router, ready to deploy on Vercel.

## The content layer

```bash
npm install @yamblog/core @yamblog/next
```

```ts
// lib/blog.ts
import { defineBlog } from '@yamblog/core';

export const blog = defineBlog('content/posts');
```

That one line is your CMS. On Vercel you don't even need to configure the site URL — `defineBlog` auto-detects it from `VERCEL_URL` (or set `NEXT_PUBLIC_SITE_URL` for a custom domain). `blog.siteUrl` then flows into every generated URL: RSS, sitemap, canonical links.

Posts are markdown files with validated frontmatter:

```md
<!-- content/posts/hello-world.md -->
---
title: "Hello World"
date: "2026-06-25"
tags: [intro]
excerpt: "First post."
---

Welcome!
```

Bad frontmatter fails `next build` with an error naming the file, so broken content never deploys.

## The pages

```tsx
// app/blog/page.tsx
import { BlogListPage } from '@yamblog/next';
import { blog } from '@/lib/blog';

export default async function Page() {
  const posts = await blog.getPosts();
  return <BlogListPage posts={posts} />;
}
```

```tsx
// app/blog/[slug]/page.tsx
import { BlogPostPage, generatePostMetadata, createStaticParams } from '@yamblog/next';
import { blog } from '@/lib/blog';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  return createStaticParams(blog);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await blog.findPostBySlug(slug);
  if (!post) return {};
  return generatePostMetadata(post, { siteUrl: blog.siteUrl, siteName: 'My Blog' });
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await blog.findPostBySlug(slug);
  if (!post) notFound();

  const adjacent = await blog.getAdjacentPosts(slug);
  return <BlogPostPage post={post} prev={adjacent.prev} next={adjacent.next} />;
}
```

Two things worth noticing:

- **`findPostBySlug` returns `null`** for a missing post, which maps cleanly onto Next's `notFound()`. (If you prefer throwing, `getPostBySlug` throws a typed `PostNotFoundError` you can catch with `instanceof` — no string matching.)
- **`generatePostMetadata`** emits the OpenGraph, Twitter card, and canonical URL metadata so shared links unfurl properly.

Because everything renders in Server Components at build time, the "CMS query" costs nothing at request time — Vercel serves static HTML from the edge.

## The SEO plumbing: three files

```ts
// app/feed.xml/route.ts
import { createRssHandler } from '@yamblog/next';
import { blog } from '@/lib/blog';

export const GET = createRssHandler(blog, {
  title: 'My Blog',
  description: 'Latest posts',
});
```

```ts
// app/sitemap.ts
import { createSitemapExport } from '@yamblog/next';
import { blog } from '@/lib/blog';

export default createSitemapExport(blog);
```

```ts
// app/blog/[slug]/opengraph-image/route.ts
import { createOgImageHandler } from '@yamblog/next';
import { blog } from '@/lib/blog';

export const GET = createOgImageHandler(blog, { siteName: 'My Blog' });
```

RSS 2.0 with a proper atom self-link, a sitemap Next serves natively, and per-post OG images rendered with `@vercel/og`. All of them read `blog.siteUrl`, and all of them exclude drafts.

## The publish workflow

This is where the file-based approach quietly wins:

1. Write `content/posts/my-new-post.md` on a branch.
2. Open a pull request — Vercel builds a preview deployment. Set `includeDrafts: process.env.VERCEL_ENV === 'preview'` in `defineBlog` and reviewers can even read `draft: true` posts on the preview URL, while RSS and the sitemap keep excluding them.
3. Merge. Production rebuilds. The post is live, in the feed, and in the sitemap.

Publishing is a `git push`. Rollback is a `git revert`. Your "CMS audit log" is `git log`. And there's no vendor to migrate away from later, because the content was never anywhere but your repo.

The [Next.js recipe](/recipes/nextjs/) covers the extras — JSON-LD, breadcrumbs, search, and custom remark pipelines — when you're ready for them.
