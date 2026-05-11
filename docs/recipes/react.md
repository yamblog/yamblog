---
title: React Guide
description: Full integration of @yamblog/core + @yamblog/react in a Vite single-page app.
---

# Recipe — React (Vite SPA)

Full integration of `@yamblog/core` + `@yamblog/react` in a Vite single-page app.

Because the browser cannot read the filesystem, posts are serialised to JSON
at build time. A small Node script handles this.

## Install

```bash
npm install @yamblog/core @yamblog/react
```

## 1. Build-time post generation

Add a script that runs before Vite builds:

```javascript
// scripts/generate-posts.mjs
import { defineBlog } from '@yamblog/core';
import { writeFileSync, mkdirSync } from 'fs';

const blog = defineBlog('content/posts');
const posts = await blog.getPosts();

const serialised = posts.map(p => ({ ...p, date: p.date.toISOString() }));

mkdirSync('src/generated', { recursive: true });
writeFileSync('src/generated/posts.json', JSON.stringify(serialised, null, 2));
console.log(`Wrote ${posts.length} posts to src/generated/posts.json`);
```

Wire it into your build:

```json
// package.json
{
  "scripts": {
    "prebuild": "node scripts/generate-posts.mjs",
    "predev": "node scripts/generate-posts.mjs",
    "build": "vite build",
    "dev": "vite"
  }
}
```

## 2. Shared posts module

Re-hydrate the JSON once and import from everywhere:

```ts
// src/lib/posts.ts
import rawPosts from '../generated/posts.json';
import type { Post } from '@yamblog/core';

export const posts: Post[] = (rawPosts as Post[]).map(p => ({
  ...p,
  date: new Date(p.date as unknown as string),
}));
```

## 3. Blog listing page

```tsx
// src/pages/BlogPage.tsx
import { useBlog, PostList } from '@yamblog/react';
import { posts } from '../lib/posts';

export default function BlogPage() {
  const { posts: filtered, query, setQuery } = useBlog(posts);

  return (
    <main>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search posts…"
      />
      <PostList posts={filtered} basePath="/blog" />
    </main>
  );
}
```

`useBlog` manages client-side search state. Filtering is done in-memory —
no network requests.

## 4. Post detail page

```tsx
// src/pages/PostPage.tsx
import { MarkdownRenderer, PostLayout } from '@yamblog/react';
import { posts } from '../lib/posts';

export default function PostPage({ slug }: { slug: string }) {
  const post = posts.find(p => p.slug === slug);
  if (!post) return <p>Post not found.</p>;

  return (
    <PostLayout post={post}>
      <MarkdownRenderer content={post.content} />
    </PostLayout>
  );
}
```

## 5. React Router setup

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import BlogPage from './pages/BlogPage';
import PostPage from './pages/PostPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<PostPageRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

function PostPageRoute() {
  const { slug } = useParams<{ slug: string }>();
  return <PostPage slug={slug!} />;
}
```

## 6. remark plugins (optional)

```tsx
import { MarkdownRenderer } from '@yamblog/react';
import { remarkToc, remarkEmbed } from '@yamblog/remark';

<MarkdownRenderer
  content={post.content}
  remarkPlugins={[remarkToc, remarkEmbed]}
/>
```

## File layout

```
content/posts/          markdown files
scripts/
  generate-posts.mjs    build-time serialisation
src/
  generated/
    posts.json          auto-generated — do not edit by hand
  lib/
    posts.ts            shared re-hydrated posts
  pages/
    BlogPage.tsx        listing + search
    PostPage.tsx        post detail
  App.tsx
```

> Add `src/generated/posts.json` to `.gitignore` if you prefer to generate it
> fresh on every build rather than committing it.
