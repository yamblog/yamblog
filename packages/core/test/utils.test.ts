import { describe, it, expect } from 'bun:test';
import { readingTime, defaultSlugify, generateId } from '../src/utils';

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
});

describe('generateId', () => {
  it('prefixes slug with blog-', () => {
    expect(generateId('my-post')).toBe('blog-my-post');
  });

  it('is deterministic', () => {
    expect(generateId('same-slug')).toBe(generateId('same-slug'));
  });
});
