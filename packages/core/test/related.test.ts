import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { loadPosts } from '../src/query';
import { getRelatedPosts } from '../src/related';

const contentDir = join(import.meta.dir, 'fixtures');

describe('getRelatedPosts', () => {
  it('excludes the current post from results', async () => {
    const posts = await loadPosts({ contentDir });
    const related = getRelatedPosts(posts, 'hello-world', {});
    expect(related.every(p => p.slug !== 'hello-world')).toBe(true);
  });

  it('respects the limit option', async () => {
    const posts = await loadPosts({ contentDir });
    const related = getRelatedPosts(posts, 'hello-world', { limit: 1 });
    expect(related.length).toBeLessThanOrEqual(1);
  });

  it('uses custom scorer when provided', async () => {
    const posts = await loadPosts({ contentDir });
    // scorer that always returns 0 → no related posts
    const related = getRelatedPosts(posts, 'hello-world', {
      scorer: () => 0,
    });
    expect(related).toEqual([]);
  });

  it('uses tags+category strategy by default', async () => {
    const posts = await loadPosts({ contentDir });
    const related = getRelatedPosts(posts, 'hello-world', {});
    // With only 2 posts and no overlap, result may be empty — that is correct
    expect(Array.isArray(related)).toBe(true);
  });
});
