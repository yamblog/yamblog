import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { loadPosts } from '../src/query';
import { generateRss } from '../src/rss';

const contentDir = join(import.meta.dir, 'fixtures');

describe('generateRss', () => {
  it('produces valid RSS 2.0 XML', async () => {
    const posts = await loadPosts({ contentDir });
    const xml = generateRss(posts, {
      siteUrl: 'https://example.com',
      title: 'My Blog',
      description: 'Latest articles',
    });

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<channel>');
    expect(xml).toContain('</channel>');
    expect(xml).toContain('</rss>');
  });

  it('includes all published posts as items', async () => {
    const posts = await loadPosts({ contentDir });
    const xml = generateRss(posts, {
      siteUrl: 'https://example.com',
      title: 'My Blog',
      description: 'Latest articles',
    });

    expect(xml).toContain('Hello World');
    expect(xml).toContain('TypeScript Tips');
  });

  it('includes correct post URLs', async () => {
    const posts = await loadPosts({ contentDir });
    const xml = generateRss(posts, {
      siteUrl: 'https://example.com',
      title: 'My Blog',
      description: 'Latest',
    });

    expect(xml).toContain('https://example.com/blog/hello-world');
  });

  it('escapes special XML characters in titles', () => {
    const xml = generateRss([], {
      siteUrl: 'https://example.com',
      title: 'Blog & More <stuff>',
      description: 'Test',
    });
    expect(xml).toContain('Blog &amp; More &lt;stuff&gt;');
  });
});
