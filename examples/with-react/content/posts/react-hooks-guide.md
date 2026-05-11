---
title: "Using @yamblog/react Hooks and Components"
date: "2026-05-05"
author: "Your Name"
tags: ["react", "tutorial"]
excerpt: "A tour of useBlog, MarkdownRenderer, PostCard, PostList, and PostLayout."
draft: false
---

# Using @yamblog/react

## useBlog

Manages client-side search over pre-fetched posts:

```tsx
import { useBlog } from '@yamblog/react';

function BlogPage({ posts }) {
  const { posts: filtered, query, setQuery } = useBlog(posts);
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <PostList posts={filtered} />
    </>
  );
}
```

## MarkdownRenderer

Renders raw markdown with react-markdown. Accepts custom components and remark/rehype plugins:

```tsx
<MarkdownRenderer
  content={post.content}
  components={{ h1: ({ children }) => <h1 className="hero">{children}</h1> }}
/>
```

## PostLayout

Wraps a post with header, tags, adjacent navigation, and a slot for rendered content:

```tsx
<PostLayout post={post} adjacent={adjacent}>
  <MarkdownRenderer content={post.content} />
</PostLayout>
```
