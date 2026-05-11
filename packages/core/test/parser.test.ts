import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { readFileSync } from 'fs';
import { parsePost } from '../src/parser';

const fixturesDir = join(import.meta.dir, 'fixtures');

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('parsePost', () => {
  it('parses frontmatter fields correctly', () => {
    const raw = readFixture('hello-world.md');
    const post = parsePost(raw, 'hello-world');

    expect(post.slug).toBe('hello-world');
    expect(post.id).toBe('blog-hello-world');
    expect(post.title).toBe('Hello World');
    expect(post.date).toBeInstanceOf(Date);
    expect(post.date.toISOString()).toContain('2024-01-15');
    expect(post.excerpt).toBe('My first blog post about getting started');
    expect(post.category).toBe('Getting Started');
    expect(post.tags).toEqual(['intro', 'welcome']);
    expect(post.author).toBe('Jane Doe');
    expect(post.featured).toBe(true);
    expect(post.draft).toBe(false);
  });

  it('includes markdown content without frontmatter', () => {
    const raw = readFixture('hello-world.md');
    const post = parsePost(raw, 'hello-world');

    expect(post.content).toContain('# Hello World');
    expect(post.content).not.toContain('---');
    expect(post.content).not.toContain('title:');
  });

  it('calculates reading time', () => {
    const raw = readFixture('hello-world.md');
    const post = parsePost(raw, 'hello-world');
    expect(post.readingTime).toBeGreaterThanOrEqual(1);
  });

  it('applies default values for optional fields', () => {
    const raw = readFixture('draft-post.md');
    const post = parsePost(raw, 'draft-post');

    expect(post.tags).toEqual([]);
    expect(post.author).toBe('Anonymous');
    expect(post.featured).toBe(false);
    expect(post.draft).toBe(true);
  });

  it('throws on invalid frontmatter', () => {
    const raw = `---\ndate: not-a-date\n---\n\nContent`;
    expect(() => parsePost(raw, 'bad-post')).toThrow();
  });
});
