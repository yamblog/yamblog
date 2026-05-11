import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { loadPosts } from '../src/query';
import { searchPosts } from '../src/search';

const contentDir = join(import.meta.dir, 'fixtures');

describe('searchPosts', () => {
  it('finds posts by title', async () => {
    const posts = await loadPosts({ contentDir });
    const results = searchPosts(posts, 'TypeScript');
    expect(results.length).toBe(1);
    expect(results[0].slug).toBe('typescript-tips');
  });

  it('finds posts by excerpt', async () => {
    const posts = await loadPosts({ contentDir });
    const results = searchPosts(posts, 'getting started');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(p => p.slug === 'hello-world')).toBe(true);
  });

  it('is case-insensitive', async () => {
    const posts = await loadPosts({ contentDir });
    const upper = searchPosts(posts, 'TYPESCRIPT');
    const lower = searchPosts(posts, 'typescript');
    expect(upper.length).toBe(lower.length);
  });

  it('returns empty array for no matches', async () => {
    const posts = await loadPosts({ contentDir });
    const results = searchPosts(posts, 'zzznomatch999');
    expect(results).toEqual([]);
  });

  it('ranks title matches above content matches', async () => {
    const posts = await loadPosts({ contentDir });
    const results = searchPosts(posts, 'typescript');
    expect(results[0].slug).toBe('typescript-tips');
  });
});
