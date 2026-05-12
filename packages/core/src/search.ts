import { z } from 'zod';
import { defaultSchema } from './types.js';
import type { Post } from './types.js';

/**
 * Simple relevance-ranked text search across title, excerpt, tags, and content.
 * Title match = 3pts, excerpt match = 2pts, tag match = 1pt, content match = 1pt.
 * Posts with score 0 are excluded from results.
 */
export function searchPosts<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  posts: Post<TSchema>[],
  query: string,
): Post<TSchema>[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return posts
    .map(post => {
      const p = post as Post;
      let score = 0;
      if (p.title.toLowerCase().includes(q)) score += 3;
      if (p.excerpt?.toLowerCase().includes(q)) score += 2;
      if (p.tags.some(t => t.toLowerCase().includes(q))) score += 1;
      if (p.content.toLowerCase().includes(q)) score += 1;
      return { post, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ post }) => post);
}
