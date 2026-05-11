import type { Post } from '@yamblog/core';

/**
 * Client-side full-text search over pre-fetched posts.
 * Scores: title (3pts) > excerpt (2pts) > tags (1pt) > content (1pt).
 */
export function clientSearch(posts: Post[], query: string): Post[] {
  const q = query.toLowerCase().trim();
  if (!q) return posts;

  return posts
    .map(post => {
      let score = 0;
      if (post.title.toLowerCase().includes(q)) score += 3;
      if (post.excerpt?.toLowerCase().includes(q)) score += 2;
      if (post.tags.some(t => t.toLowerCase().includes(q))) score += 1;
      if (post.content.toLowerCase().includes(q)) score += 1;
      return { post, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ post }) => post);
}
