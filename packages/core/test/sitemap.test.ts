import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { loadPosts } from '../src/query';
import { generateSitemap } from '../src/sitemap';

const contentDir = join(import.meta.dir, 'fixtures');

describe('generateSitemap', () => {
  it('produces valid sitemap XML', async () => {
    const posts = await loadPosts({ contentDir });
    const xml = generateSitemap(posts, { siteUrl: 'https://example.com' });

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('sitemaps.org');
    expect(xml).toContain('</urlset>');
  });

  it('includes a URL entry for each post', async () => {
    const posts = await loadPosts({ contentDir });
    const xml = generateSitemap(posts, { siteUrl: 'https://example.com' });

    expect(xml).toContain('https://example.com/blog/hello-world');
    expect(xml).toContain('https://example.com/blog/typescript-tips');
  });

  it('includes lastmod date', async () => {
    const posts = await loadPosts({ contentDir });
    const xml = generateSitemap(posts, { siteUrl: 'https://example.com' });

    expect(xml).toContain('<lastmod>');
    expect(xml).toContain('2024-01-15');
  });
});

describe('generateSitemap basePath', () => {
  it('uses a custom basePath in URLs', async () => {
    const posts = await loadPosts({ contentDir });
    const xml = generateSitemap(posts, { siteUrl: 'https://example.com', basePath: '/articles' });
    expect(xml).toContain('https://example.com/articles/hello-world');
  });

  it('supports mounting at the site root with an empty basePath', async () => {
    const posts = await loadPosts({ contentDir });
    const xml = generateSitemap(posts, { siteUrl: 'https://example.com', basePath: '' });
    expect(xml).toContain('<loc>https://example.com/hello-world</loc>');
  });

  it('normalizes messy basePath values', async () => {
    const posts = await loadPosts({ contentDir });
    const xml = generateSitemap(posts, { siteUrl: 'https://example.com', basePath: 'articles/' });
    expect(xml).toContain('<loc>https://example.com/articles/hello-world</loc>');
  });
});

describe('generateSitemap drafts', () => {
  it('excludes drafts unless includeDrafts is passed', async () => {
    const posts = await loadPosts({ contentDir, includeDrafts: true });
    const base = { siteUrl: 'https://example.com' };
    expect(generateSitemap(posts, base)).not.toContain('draft-post');
    expect(generateSitemap(posts, { ...base, includeDrafts: true })).toContain('draft-post');
  });
});
