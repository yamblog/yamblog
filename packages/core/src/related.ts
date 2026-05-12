import { z } from 'zod';
import { defaultSchema } from './types.js';
import type { Post, RelatedPostsConfig } from './types.js';

function defaultScorer<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  strategy: RelatedPostsConfig['strategy'] = 'tags+category',
): (current: Post<TSchema>, candidate: Post<TSchema>) => number {
  return (current, candidate) => {
    const c = current as Post;
    const d = candidate as Post;
    let score = 0;
    if (strategy === 'tags' || strategy === 'tags+category') {
      const sharedTags = c.tags.filter(t => d.tags.includes(t));
      score += sharedTags.length * 2;
    }
    if (strategy === 'category' || strategy === 'tags+category') {
      if (c.category && c.category === d.category) {
        score += 1;
      }
    }
    return score;
  };
}

/**
 * Returns up to `limit` related posts for a given slug, sorted by relevance score.
 * Posts with score 0 are excluded.
 * The current post is always excluded from results.
 */
export function getRelatedPosts<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  posts: Post<TSchema>[],
  slug: string,
  config: RelatedPostsConfig<TSchema>,
): Post<TSchema>[] {
  const { limit = 3, strategy = 'tags+category', scorer } = config;
  const current = posts.find(p => p.slug === slug);
  if (!current) return [];

  const score = scorer ?? defaultScorer<TSchema>(strategy);

  return posts
    .filter(p => p.slug !== slug)
    .map(candidate => ({ post: candidate, score: score(current, candidate) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post }) => post);
}
