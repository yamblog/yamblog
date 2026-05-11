import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { loadPosts } from '../src/query';
import { generateLlmsTxt } from '../src/llms';

const contentDir = join(import.meta.dir, 'fixtures');

describe('generateLlmsTxt', () => {
  it('starts with the section heading', async () => {
    const posts = await loadPosts({ contentDir });
    const txt = generateLlmsTxt(posts, { siteUrl: 'https://example.com' });
    expect(txt.startsWith('## Blog')).toBe(true);
  });

  it('returns only featured posts by default', async () => {
    const posts = await loadPosts({ contentDir });
    const txt = generateLlmsTxt(posts, { siteUrl: 'https://example.com' });
    // hello-world.md has featured: true; typescript-tips.md has featured: false
    expect(txt).toContain('Hello World');
    expect(txt).not.toContain('TypeScript Tips');
  });

  it('includes correct post URLs', async () => {
    const posts = await loadPosts({ contentDir });
    const txt = generateLlmsTxt(posts, { siteUrl: 'https://example.com' });
    expect(txt).toContain('https://example.com/blog/hello-world');
  });

  it('includes excerpt after colon when post has an excerpt', async () => {
    const posts = await loadPosts({ contentDir });
    const txt = generateLlmsTxt(posts, { siteUrl: 'https://example.com' });
    expect(txt).toContain('): My first blog post about getting started');
  });

  it('omits colon and excerpt when post has no excerpt', async () => {
    const posts = await loadPosts({ contentDir });
    const base = posts.find(p => p.slug === 'hello-world')!;
    const noExcerpt = { ...base, excerpt: undefined };
    const txt = generateLlmsTxt([noExcerpt], { siteUrl: 'https://example.com' });
    expect(txt).toContain('[Hello World](https://example.com/blog/hello-world)');
    expect(txt).not.toContain('):');
  });

  it('uses custom filter when provided', async () => {
    const posts = await loadPosts({ contentDir });
    const txt = generateLlmsTxt(posts, {
      siteUrl: 'https://example.com',
      filter: () => true,
    });
    expect(txt).toContain('Hello World');
    expect(txt).toContain('TypeScript Tips');
  });

  it('uses custom section title when provided', async () => {
    const posts = await loadPosts({ contentDir });
    const txt = generateLlmsTxt(posts, {
      siteUrl: 'https://example.com',
      sectionTitle: 'Latest Articles',
    });
    expect(txt).toContain('## Latest Articles');
  });

  it('returns empty-section message when no posts match filter', async () => {
    const posts = await loadPosts({ contentDir });
    const txt = generateLlmsTxt(posts, {
      siteUrl: 'https://example.com',
      filter: () => false,
    });
    expect(txt).toContain('## Blog');
    expect(txt).toContain('*(no posts)*');
  });
});
