import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import {
  loadPosts,
  getPostBySlug,
  findPostBySlug,
  getPostsByCategory,
  getPostsByTag,
  getFeaturedPosts,
  getCategories,
  getTags,
  getAdjacentPosts,
} from '../src/query';
import { PostNotFoundError } from '../src/errors';

const contentDir = join(import.meta.dir, 'fixtures');

describe('loadPosts', () => {
  it('loads all published posts', async () => {
    const posts = await loadPosts({ contentDir });
    expect(posts.length).toBe(2); // excludes draft
    expect(posts.every(p => !p.draft)).toBe(true);
  });

  it('sorts by date descending by default', async () => {
    const posts = await loadPosts({ contentDir });
    expect(posts[0].slug).toBe('typescript-tips'); // 2024-02-20
    expect(posts[1].slug).toBe('hello-world');     // 2024-01-15
  });

  it('applies custom sortBy', async () => {
    const posts = await loadPosts({
      contentDir,
      sortBy: (a, b) => a.date.getTime() - b.date.getTime(), // oldest first
    });
    expect(posts[0].slug).toBe('hello-world');
  });

  it('includes drafts when includeDrafts is true', async () => {
    const posts = await loadPosts({ contentDir, includeDrafts: true });
    expect(posts.length).toBe(3);
    expect(posts.some(p => p.draft)).toBe(true);
  });

  it('throws a descriptive error when a filename produces an empty slug', async () => {
    const { mkdtempSync, writeFileSync } = await import('fs');
    const { tmpdir } = await import('os');
    const dir = mkdtempSync(join(tmpdir(), 'yamblog-slug-'));
    // Sanitizes to an empty slug: no [a-z0-9] characters at all
    writeFileSync(join(dir, '???.md'), '---\ntitle: T\ndate: 2024-01-01\n---\nbody');
    expect(loadPosts({ contentDir: dir })).rejects.toThrow(/produced an empty slug.*\?\?\?\.md|"\?\?\?\.md" produced an empty slug/);
  });
});

describe('findPostBySlug', () => {
  it('returns the post with matching slug', async () => {
    const posts = await loadPosts({ contentDir });
    const post = findPostBySlug(posts, 'hello-world');
    expect(post?.title).toBe('Hello World');
  });

  it('returns null for an unknown slug', async () => {
    const posts = await loadPosts({ contentDir });
    expect(findPostBySlug(posts, 'nonexistent')).toBeNull();
  });
});

describe('getPostBySlug', () => {
  it('returns the post with matching slug', async () => {
    const posts = await loadPosts({ contentDir });
    const post = getPostBySlug(posts, 'hello-world');
    expect(post.title).toBe('Hello World');
  });

  it('throws when post not found', async () => {
    const posts = await loadPosts({ contentDir });
    expect(() => getPostBySlug(posts, 'nonexistent')).toThrow(
      'Post not found: nonexistent',
    );
  });

  it('throws a typed PostNotFoundError carrying the slug', async () => {
    const posts = await loadPosts({ contentDir });
    try {
      getPostBySlug(posts, 'nonexistent');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PostNotFoundError);
      expect(err).toBeInstanceOf(Error);
      expect((err as PostNotFoundError).slug).toBe('nonexistent');
      expect((err as PostNotFoundError).name).toBe('PostNotFoundError');
    }
  });
});

describe('getPostsByCategory', () => {
  it('filters by category', async () => {
    const posts = await loadPosts({ contentDir });
    const filtered = getPostsByCategory(posts, 'TypeScript');
    expect(filtered.length).toBe(1);
    expect(filtered[0].slug).toBe('typescript-tips');
  });

  it('returns empty array for unknown category', async () => {
    const posts = await loadPosts({ contentDir });
    expect(getPostsByCategory(posts, 'Nonexistent')).toEqual([]);
  });
});

describe('getPostsByTag', () => {
  it('filters posts by tag', async () => {
    const posts = await loadPosts({ contentDir });
    const filtered = getPostsByTag(posts, 'typescript');
    expect(filtered.length).toBe(1);
    expect(filtered[0].slug).toBe('typescript-tips');
  });
});

describe('getFeaturedPosts', () => {
  it('returns only featured posts', async () => {
    const posts = await loadPosts({ contentDir });
    const featured = getFeaturedPosts(posts);
    expect(featured.length).toBe(1);
    expect(featured[0].slug).toBe('hello-world');
  });
});

describe('getCategories', () => {
  it('returns unique categories', async () => {
    const posts = await loadPosts({ contentDir });
    const categories = getCategories(posts);
    expect(categories).toContain('Getting Started');
    expect(categories).toContain('TypeScript');
    expect(new Set(categories).size).toBe(categories.length); // no duplicates
  });
});

describe('getTags', () => {
  it('returns unique tags', async () => {
    const posts = await loadPosts({ contentDir });
    const tags = getTags(posts);
    expect(tags).toContain('typescript');
    expect(tags).toContain('intro');
    expect(new Set(tags).size).toBe(tags.length); // no duplicates
  });
});

describe('getAdjacentPosts', () => {
  it('returns prev and next posts', async () => {
    const posts = await loadPosts({ contentDir });
    // posts are sorted newest-first: typescript-tips (0), hello-world (1)
    const { prev, next } = getAdjacentPosts(posts, 'typescript-tips');
    expect(prev).toBeNull();
    expect(next?.slug).toBe('hello-world');
  });

  it('returns null for prev on first post', async () => {
    const posts = await loadPosts({ contentDir });
    const { prev } = getAdjacentPosts(posts, 'typescript-tips');
    expect(prev).toBeNull();
  });

  it('throws PostNotFoundError for an unknown slug', async () => {
    const posts = await loadPosts({ contentDir });
    expect(() => getAdjacentPosts(posts, 'nonexistent')).toThrow(PostNotFoundError);
  });
});
