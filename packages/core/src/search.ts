import { z } from 'zod';
import { defaultSchema } from './types.js';
import type { Post } from './types.js';
import { assertPostsHaveField } from './guards.js';

// Lowercased post bodies, memoised per post object so a search endpoint does
// not re-lowercase the whole corpus on every query. The source string is kept
// alongside so a mutated `content` is picked up.
const lowerContentCache = new WeakMap<object, { source: string; lower: string }>();

function lowerContent(post: Post): string {
  const cached = lowerContentCache.get(post);
  if (cached && cached.source === post.content) return cached.lower;
  const lower = post.content.toLowerCase();
  lowerContentCache.set(post, { source: post.content, lower });
  return lower;
}

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
  assertPostsHaveField(posts, 'title', 'search()');
  assertPostsHaveField(posts, 'tags', 'search()');

  return posts
    .map(post => {
      const p = post as Post;
      let score = 0;
      if (p.title.toLowerCase().includes(q)) score += 3;
      if (p.excerpt?.toLowerCase().includes(q)) score += 2;
      if (p.tags.some(t => t.toLowerCase().includes(q))) score += 1;
      if (lowerContent(p).includes(q)) score += 1;
      return { post, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ post }) => post);
}
