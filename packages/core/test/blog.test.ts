import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { createBlog } from '../src/blog';

const contentDir = join(import.meta.dir, 'fixtures');

describe('createBlog', () => {
  const blog = createBlog({ contentDir });

  it('getPosts returns published posts', async () => {
    const posts = await blog.getPosts();
    expect(posts.length).toBe(2);
    expect(posts.every(p => !p.draft)).toBe(true);
  });

  it('getPostBySlug returns the correct post', async () => {
    const post = await blog.getPostBySlug('hello-world');
    expect(post.title).toBe('Hello World');
    expect(post.id).toBe('blog-hello-world');
  });

  it('getPostsByCategory filters correctly', async () => {
    const posts = await blog.getPostsByCategory('TypeScript');
    expect(posts.length).toBe(1);
  });

  it('getPostsByTag filters correctly', async () => {
    const posts = await blog.getPostsByTag('intro');
    expect(posts.length).toBe(1);
  });

  it('getFeaturedPosts returns featured posts', async () => {
    const posts = await blog.getFeaturedPosts();
    expect(posts.every(p => p.featured)).toBe(true);
  });

  it('search returns matching posts', async () => {
    const results = await blog.search('TypeScript');
    expect(results.length).toBe(1);
  });

  it('getAdjacentPosts returns prev/next', async () => {
    const { prev, next } = await blog.getAdjacentPosts('typescript-tips');
    expect(prev).toBeNull();
    expect(next?.slug).toBe('hello-world');
  });

  it('getRelatedPosts excludes current post', async () => {
    const related = await blog.getRelatedPosts('hello-world');
    expect(related.every(p => p.slug !== 'hello-world')).toBe(true);
  });

  it('getCategories returns unique categories', async () => {
    const cats = await blog.getCategories();
    expect(cats).toContain('TypeScript');
    expect(cats).toContain('Getting Started');
  });

  it('getTags returns unique tags', async () => {
    const tags = await blog.getTags();
    expect(tags).toContain('typescript');
    expect(tags).toContain('intro');
  });

  it('generateRss returns XML string', async () => {
    const xml = await blog.generateRss({
      siteUrl: 'https://example.com',
      title: 'My Blog',
      description: 'Latest',
    });
    expect(xml).toContain('<rss');
    expect(xml).toContain('Hello World');
  });

  it('generateSitemap returns XML string', async () => {
    const xml = await blog.generateSitemap({ siteUrl: 'https://example.com' });
    expect(xml).toContain('<urlset');
    expect(xml).toContain('hello-world');
  });

  it('generateLlmsTxt returns the blog section markdown', async () => {
    const txt = await blog.generateLlmsTxt({ siteUrl: 'https://example.com' });
    expect(txt).toContain('## Blog');
    expect(txt).toContain('Hello World');
  });

  it('generateLlmsTxt uses config siteUrl when no override given', async () => {
    const b = createBlog({ contentDir, siteUrl: 'https://myblog.com' });
    const txt = await b.generateLlmsTxt();
    expect(txt).toContain('https://myblog.com/blog/');
  });

  it('generateSearchIndex returns lightweight JSON entries', async () => {
    const index = await blog.generateSearchIndex();
    expect(index.length).toBe(2);
    const entry = index.find(e => e.slug === 'hello-world');
    expect(entry).toBeDefined();
    expect(entry?.id).toBe('blog-hello-world');
    expect(typeof entry?.date).toBe('string');
    expect(entry).not.toHaveProperty('content');
    expect(entry).not.toHaveProperty('draft');
  });

  it('getPosts returns the same posts on repeated calls', async () => {
    const blog2 = createBlog({ contentDir });
    const a = await blog2.getPosts();
    const b = await blog2.getPosts();
    expect(a).toBe(b);
  });
});
