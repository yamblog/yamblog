import { useState } from 'react';
import type { Post } from '@yamblog/core';
import rawPosts from './generated/posts.json';
import { BlogListPage } from './pages/BlogListPage';
import { BlogPostPage } from './pages/BlogPostPage';

// Rehydrate date strings back to Date objects
const posts: Post[] = (rawPosts as Array<Post & { date: string }>).map(p => ({
  ...p,
  date: new Date(p.date),
}));

export function App() {
  const [slug, setSlug] = useState<string | null>(null);

  if (slug) {
    const post = posts.find(p => p.slug === slug);
    if (!post) return <p style={{ padding: '2rem' }}>Post not found.</p>;
    const idx = posts.findIndex(p => p.slug === slug);
    const adjacent = {
      prev: idx > 0 ? posts[idx - 1] : null,
      next: idx < posts.length - 1 ? posts[idx + 1] : null,
    };
    return (
      <BlogPostPage
        post={post}
        adjacent={adjacent}
        onBack={() => setSlug(null)}
        onNavigate={setSlug}
      />
    );
  }

  return <BlogListPage posts={posts} onSelect={setSlug} />;
}
