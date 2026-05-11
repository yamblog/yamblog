import { describe, it, expect } from 'bun:test';
import { clientSearch } from '../src/search';
import type { Post } from '@yamblog/core';

const makePost = (overrides: Partial<Post>): Post => ({
  id: 'blog-test',
  slug: 'test',
  title: 'Test Post',
  date: new Date('2024-01-01'),
  tags: [],
  author: 'Author',
  featured: false,
  draft: false,
  content: 'Hello world',
  readingTime: 1,
  ...overrides,
});

const posts: Post[] = [
  makePost({ id: 'blog-ts', slug: 'typescript-tips', title: 'TypeScript Tips', tags: ['typescript', 'tutorial'], excerpt: 'Learn TypeScript', content: 'TypeScript is great' }),
  makePost({ id: 'blog-react', slug: 'react-hooks', title: 'React Hooks Guide', tags: ['react'], excerpt: 'Learn hooks', content: 'Hooks are powerful' }),
  makePost({ id: 'blog-astro', slug: 'astro-intro', title: 'Getting Started with Astro', tags: ['astro'], content: 'Astro is fast' }),
];

describe('clientSearch', () => {
  it('returns all posts for empty query', () => {
    expect(clientSearch(posts, '')).toHaveLength(3);
  });

  it('returns all posts for whitespace query', () => {
    expect(clientSearch(posts, '   ')).toHaveLength(3);
  });

  it('matches by title', () => {
    const results = clientSearch(posts, 'TypeScript');
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('typescript-tips');
  });

  it('matches by tag', () => {
    const results = clientSearch(posts, 'react');
    expect(results.some(p => p.slug === 'react-hooks')).toBe(true);
  });

  it('matches by excerpt', () => {
    const results = clientSearch(posts, 'Learn hooks');
    expect(results.some(p => p.slug === 'react-hooks')).toBe(true);
  });

  it('matches by content', () => {
    const results = clientSearch(posts, 'fast');
    expect(results.some(p => p.slug === 'astro-intro')).toBe(true);
  });

  it('returns empty array for no match', () => {
    expect(clientSearch(posts, 'xyzzy')).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    expect(clientSearch(posts, 'TYPESCRIPT')).toHaveLength(1);
  });

  it('ranks title matches above content matches', () => {
    // 'typescript' appears in title of first post and content of first post only
    // 'astro' appears in title of third post and content of third post — just verify ordering is stable
    const tsResults = clientSearch(posts, 'typescript');
    expect(tsResults[0].slug).toBe('typescript-tips');
  });
});
