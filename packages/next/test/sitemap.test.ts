import { describe, it, expect } from 'bun:test';
import { createSitemapExport } from '../src/sitemap';
import type { Blog, Post } from '@yamblog/core';

const posts = [
  { slug: 'hello-world', date: new Date('2024-01-15'), draft: false },
  { slug: 'draft-post', date: new Date('2024-03-01'), draft: true },
] as unknown as Post[];

const blog = {
  siteUrl: 'https://example.com',
  basePath: '/blog',
  getPosts: async () => posts,
} as unknown as Blog;

describe('createSitemapExport', () => {
  it("uses the blog's siteUrl and basePath by default", async () => {
    const entries = await createSitemapExport(blog)();
    expect(entries.map(e => e.url)).toContain('https://example.com/blog/hello-world');
  });

  it('normalizes messy basePath overrides', async () => {
    const entries = await createSitemapExport(blog, { basePath: 'articles/' })();
    expect(entries.map(e => e.url)).toContain('https://example.com/articles/hello-world');
  });

  it('excludes drafts unless includeDrafts is passed', async () => {
    const urls = (await createSitemapExport(blog)()).map(e => e.url);
    expect(urls.some(u => u.includes('draft-post'))).toBe(false);

    const withDrafts = (await createSitemapExport(blog, { includeDrafts: true })()).map(e => e.url);
    expect(withDrafts.some(u => u.includes('draft-post'))).toBe(true);
  });
});
