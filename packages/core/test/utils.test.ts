import { describe, it, expect } from 'bun:test';
import { readingTime, defaultSlugify, generateId, normalizeBasePath } from '../src/utils';

describe('readingTime', () => {
  it('returns 1 for short content', () => {
    expect(readingTime('word '.repeat(100))).toBe(1);
  });

  it('rounds up to nearest minute', () => {
    // 201 words at 200 WPM = ceil(1.005) = 2 minutes
    expect(readingTime('word '.repeat(201))).toBe(2);
  });

  it('returns 1 as minimum for empty string', () => {
    expect(readingTime('')).toBe(1);
  });
});

describe('defaultSlugify', () => {
  it('strips .md extension', () => {
    expect(defaultSlugify('my-post.md')).toBe('my-post');
  });

  it('strips .mdx extension', () => {
    expect(defaultSlugify('my-post.mdx')).toBe('my-post');
  });

  it('handles filenames without extension', () => {
    expect(defaultSlugify('my-post')).toBe('my-post');
  });

  it('lowercases and replaces spaces with dashes', () => {
    expect(defaultSlugify('My Post.md')).toBe('my-post');
  });

  it('replaces underscores and collapses repeated separators', () => {
    expect(defaultSlugify('my__cool  post.md')).toBe('my-cool-post');
  });

  it('strips characters that are not URL-safe', () => {
    expect(defaultSlugify('Hello, World! (draft).md')).toBe('hello-world-draft');
  });

  it('trims leading and trailing dashes', () => {
    expect(defaultSlugify('-my-post-.md')).toBe('my-post');
  });
});

describe('normalizeBasePath', () => {
  it('keeps a normal path unchanged', () => {
    expect(normalizeBasePath('/blog')).toBe('/blog');
  });

  it('adds a missing leading slash', () => {
    expect(normalizeBasePath('blog')).toBe('/blog');
  });

  it('strips trailing slashes', () => {
    expect(normalizeBasePath('/blog/')).toBe('/blog');
  });

  it('normalizes empty and root paths to the site root', () => {
    expect(normalizeBasePath('')).toBe('');
    expect(normalizeBasePath('/')).toBe('');
  });
});

describe('generateId', () => {
  it('prefixes slug with blog-', () => {
    expect(generateId('my-post')).toBe('blog-my-post');
  });

  it('is deterministic', () => {
    expect(generateId('same-slug')).toBe(generateId('same-slug'));
  });
});
