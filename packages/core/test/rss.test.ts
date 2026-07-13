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

describe('generateRss feed metadata', () => {
  it('includes an atom:link self reference', async () => {
    const posts = await loadPosts({ contentDir });
    const xml = generateRss(posts, {
      siteUrl: 'https://example.com',
      title: 'My Blog',
      description: 'Latest',
    });
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
    // Default self URL is {siteUrl}/feed.xml — where the docs and examples mount the feed
    expect(xml).toContain(
      '<atom:link href="https://example.com/feed.xml" rel="self" type="application/rss+xml"/>',
    );
  });

  it('honors a custom feedUrl', () => {
    const xml = generateRss([], {
      siteUrl: 'https://example.com',
      feedUrl: 'https://example.com/blog/rss.xml',
      title: 'My Blog',
      description: 'Latest',
    });
    expect(xml).toContain('href="https://example.com/blog/rss.xml"');
  });

  it('excludes drafts unless includeDrafts is passed', async () => {
    const posts = await loadPosts({ contentDir, includeDrafts: true });
    const base = { siteUrl: 'https://example.com', title: 'My Blog', description: 'Latest' };
    expect(generateRss(posts, base)).not.toContain('Draft Post');
    expect(generateRss(posts, { ...base, includeDrafts: true })).toContain('Draft Post');
  });

  it('includes lastBuildDate from the newest post', async () => {
    const posts = await loadPosts({ contentDir });
    const xml = generateRss(posts, {
      siteUrl: 'https://example.com',
      title: 'My Blog',
      description: 'Latest',
    });
    expect(xml).toContain('<lastBuildDate>');
    expect(xml).toContain('2024');
  });

  it('omits lastBuildDate when there are no posts', () => {
    const xml = generateRss([], {
      siteUrl: 'https://example.com',
      title: 'My Blog',
      description: 'Latest',
    });
    expect(xml).not.toContain('<lastBuildDate>');
  });

  it('honors a custom language', () => {
    const xml = generateRss([], {
      siteUrl: 'https://example.com',
      language: 'de',
      title: 'My Blog',
      description: 'Latest',
    });
    expect(xml).toContain('<language>de</language>');
  });

  it('uses a custom basePath in post URLs', async () => {
    const posts = await loadPosts({ contentDir });
    const xml = generateRss(posts, {
      siteUrl: 'https://example.com',
      basePath: '/articles',
      title: 'My Blog',
      description: 'Latest',
    });
    expect(xml).toContain('https://example.com/articles/hello-world');
  });
});
