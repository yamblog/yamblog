# @yamblog/react

React adapter for `@yamblog/core`. Client-side search hook and pre-built UI components.

## Install

```bash
npm install @yamblog/core @yamblog/react
```

## Usage

### `useBlog` — client-side search state

Takes pre-fetched posts (from RSC, a server loader, or a build-time script) and manages live search filtering:

```tsx
import { useBlog, PostList } from '@yamblog/react';
import type { Post } from '@yamblog/core';

function BlogPage({ initialPosts }: { initialPosts: Post[] }) {
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

### `MarkdownRenderer` — render post content

```tsx
import { MarkdownRenderer } from '@yamblog/react';

<MarkdownRenderer
  content={post.content}
  components={{ h1: ({ children }) => <h1 className="hero">{children}</h1> }}
  remarkPlugins={[remarkGfm]}
/>
```

### `PostLayout` — full post page shell

```tsx
import { PostLayout, MarkdownRenderer } from '@yamblog/react';

<PostLayout post={post} adjacent={adjacent}>
  <MarkdownRenderer content={post.content} />
</PostLayout>
```

## Vite SPA pattern

For a plain React SPA, generate posts as JSON at build time:

```js
// scripts/generate-posts.mjs
import { createBlog } from '@yamblog/core';
import { writeFileSync } from 'fs';

const blog = createBlog({ contentDir: './content/posts' });
const posts = await blog.getPosts();
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
| `useBlog(posts)` | Hook: manages search query state, returns filtered posts |
| `clientSearch(posts, query)` | Pure function: client-side full-text search |
| `MarkdownRenderer` | Renders markdown via react-markdown; accepts plugins and custom renderers |
| `PostCard` | Single post summary card (title, date, reading time, tags) |
| `PostList` | Maps `PostCard` over a posts array; configurable empty state |
| `PostLayout` | Post header + content slot + adjacent prev/next navigation |
