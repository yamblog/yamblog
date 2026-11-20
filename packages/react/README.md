# @yamblog/react

[![npm](https://img.shields.io/npm/v/%40yamblog%2Freact)](https://www.npmjs.com/package/@yamblog/react) [![downloads](https://img.shields.io/npm/dm/%40yamblog%2Freact)](https://www.npmjs.com/package/@yamblog/react)

React adapter for `@yamblog/core`. Client-side search hook and pre-built UI components.

## Install

```bash
npm install @yamblog/core @yamblog/react
```

`react` (18 or 19) is a peer dependency.

## Usage

### `useBlog` — client-side search state

Takes pre-fetched posts (from RSC, a server loader, or a build-time script) and manages live search filtering. Filtering runs on a deferred copy of the query (`useDeferredValue`), so typing stays responsive; `query` itself updates immediately.

```tsx
'use client';
import { useBlog, PostList } from '@yamblog/react';
import type { Post } from '@yamblog/core';

export function BlogPage({ initialPosts }: { initialPosts: Post[] }) {
  const { posts, query, setQuery } = useBlog(initialPosts);

  return (
    <>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <PostList posts={posts} />
    </>
  );
}
```

To keep post bodies out of the browser bundle, pass the slimmer search index instead of full posts. `useBlog` and `clientSearch` accept any objects with `title`, `tags` and optional `excerpt` / `content`, and return the same objects you passed in. Search index entries have a string `date` and no `content`, so render them with your own markup rather than `PostList`:

```tsx
// server
const entries = await blog.generateSearchIndex();
// client
const { posts } = useBlog(entries); // posts: SearchIndexEntry[]
```

### `MarkdownRenderer` — render post content

```tsx
import remarkGfm from 'remark-gfm';
import { MarkdownRenderer } from '@yamblog/react';

<MarkdownRenderer
  content={post.content}
  className="prose"
  components={{ h1: ({ children }) => <h1 className="hero">{children}</h1> }}
  remarkPlugins={[remarkGfm]}
/>
```

Raw HTML in the markdown is not rendered (react-markdown's default). Plugin and component arrays defined inline are new on every render; hoist them to module scope if the renderer sits in a frequently re-rendering client component.

### `PostLayout` — full post page shell

```tsx
import { PostLayout, MarkdownRenderer } from '@yamblog/react';

const adjacent = await blog.getAdjacentPosts(post.slug);

<PostLayout post={post} adjacent={adjacent} basePath="/blog">
  <MarkdownRenderer content={post.content} />
</PostLayout>
```

Dates in `PostCard` and `PostLayout` are formatted in UTC (`January 15, 2024`), so server and client renders agree and a date-only frontmatter value never shows the previous day.

## Vite SPA pattern

For a plain React SPA, generate posts as JSON at build time:

```js
// scripts/generate-posts.mjs
import { createBlog } from '@yamblog/core';
import { mkdirSync, writeFileSync } from 'fs';

const blog = createBlog({ contentDir: './content/posts' });
const posts = await blog.getPosts();
mkdirSync('src/generated', { recursive: true });
writeFileSync('src/generated/posts.json', JSON.stringify(
  posts.map(p => ({ ...p, date: p.date.toISOString() }))
));
```

Then import `posts.json` in your app and rehydrate the dates:

```ts
import rawPosts from './generated/posts.json';
const posts = rawPosts.map(p => ({ ...p, date: new Date(p.date) }));
```

## API

| Export | Description |
|--------|-------------|
| `useBlog(posts)` | Hook: manages search query state, returns `{ posts, query, setQuery }` with the filtered posts |
| `clientSearch(posts, query)` | Pure function: client-side full-text search (title > excerpt > tags > content); an empty query returns all posts |
| `MarkdownRenderer` | Renders markdown via react-markdown. Props: `content`, `components?`, `remarkPlugins?`, `rehypePlugins?`, `className?` |
| `PostCard` | Single post summary card (title, date, reading time, tags). Props: `post`, `basePath?` (default `/blog`) |
| `PostList` | Maps `PostCard` over a posts array. Props: `posts`, `basePath?`, `emptyState?` |
| `PostLayout` | Post header + content slot + prev/next navigation. Props: `post`, `children`, `adjacent?`, `basePath?` |

Types: `UseBlogResult`, `MarkdownRendererProps`, `PostCardProps`, `PostListProps`, `PostLayoutProps`, `SearchablePost`.
