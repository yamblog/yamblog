import type { Post } from './types.js';

type SearchScore = { post: Post; score: number };

/**
 * Simple relevance-ranked text search across title, excerpt, tags, and content.
 * Title match = 3pts, excerpt match = 2pts, tag match = 1pt, content match = 1pt.
 * Posts with score 0 are excluded from results.
 */
export function searchPosts(posts: Post[], query: string): Post[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored: SearchScore[] = posts
    .map(post => {
      let score = 0;
      if (post.title.toLowerCase().includes(q)) score += 3;
      if (post.excerpt?.toLowerCase().includes(q)) score += 2;
      if (post.tags.some(t => t.toLowerCase().includes(q))) score += 1;
      if (post.content.toLowerCase().includes(q)) score += 1;
      return { post, score };
    })
    .filter(({ score }) => score > 0);

  return scored
    .sort((a, b) => b.score - a.score)
    .map(({ post }) => post);
}
