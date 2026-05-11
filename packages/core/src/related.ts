import type { Post, RelatedPostsConfig } from './types.js';

function defaultScorer(
  strategy: RelatedPostsConfig['strategy'] = 'tags+category',
): (current: Post, candidate: Post) => number {
  return (current, candidate) => {
    let score = 0;
    if (strategy === 'tags' || strategy === 'tags+category') {
      const sharedTags = current.tags.filter(t => candidate.tags.includes(t));
      score += sharedTags.length * 2;
    }
    if (strategy === 'category' || strategy === 'tags+category') {
      if (current.category && current.category === candidate.category) {
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
export function getRelatedPosts(
  posts: Post[],
  slug: string,
  config: RelatedPostsConfig,
): Post[] {
  const { limit = 3, strategy = 'tags+category', scorer } = config;
  const current = posts.find(p => p.slug === slug);
  if (!current) return [];

  const score = scorer ?? defaultScorer(strategy);

  return posts
    .filter(p => p.slug !== slug)
    .map(candidate => ({ post: candidate, score: score(current, candidate) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post }) => post);
}
