import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { createBlog } from '../src/blog';
import { PostNotFoundError } from '../src/errors';

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

  it('findPostBySlug returns the post or null', async () => {
    const post = await blog.findPostBySlug('hello-world');
    expect(post?.title).toBe('Hello World');
    expect(await blog.findPostBySlug('nonexistent')).toBeNull();
  });

  it('getPostBySlug rejects with a catchable PostNotFoundError', async () => {
    try {
      await blog.getPostBySlug('nonexistent');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PostNotFoundError);
      expect((err as PostNotFoundError).slug).toBe('nonexistent');
      // Message unchanged for consumers that still string-match
      expect((err as Error).message).toBe('Post not found: nonexistent');
    }
  });

  it('exposes the normalized basePath, defaulting to /blog', () => {
    expect(blog.basePath).toBe('/blog');
    expect(createBlog({ contentDir, basePath: 'posts/' }).basePath).toBe('/posts');
    expect(createBlog({ contentDir, basePath: '' }).basePath).toBe('');
  });

  it('includes drafts when includeDrafts is set', async () => {
    const b = createBlog({ contentDir, includeDrafts: true });
    const posts = await b.getPosts();
    expect(posts.length).toBe(3);
  });

  it('uses a custom basePath in RSS, sitemap, and llms.txt URLs', async () => {
    const b = createBlog({ contentDir, siteUrl: 'https://example.com', basePath: '/articles' });
    const rss = await b.generateRss({ title: 'T', description: 'D' });
    const sitemap = await b.generateSitemap();
    const llms = await b.generateLlmsTxt({ filter: () => true });
    expect(rss).toContain('https://example.com/articles/hello-world');
    expect(sitemap).toContain('https://example.com/articles/hello-world');
    expect(llms).toContain('https://example.com/articles/hello-world');
  });

  it('keeps drafts out of generated artifacts even when includeDrafts is set', async () => {
    const b = createBlog({ contentDir, siteUrl: 'https://example.com', includeDrafts: true });
    expect(await b.generateRss({ title: 'T', description: 'D' })).not.toContain('Draft Post');
    expect(await b.generateSitemap()).not.toContain('draft-post');
    expect(await b.generateLlmsTxt({ filter: () => true })).not.toContain('Draft Post');
    const index = await b.generateSearchIndex();
    expect(index.some(e => e.slug === 'draft-post')).toBe(false);
  });

  it('includes drafts in generated artifacts only via their own includeDrafts option', async () => {
    const b = createBlog({ contentDir, siteUrl: 'https://example.com', includeDrafts: true });
    expect(await b.generateRss({ title: 'T', description: 'D', includeDrafts: true })).toContain('Draft Post');
    expect(await b.generateSitemap({ includeDrafts: true })).toContain('draft-post');
    const index = await b.generateSearchIndex({ includeDrafts: true });
    expect(index.some(e => e.slug === 'draft-post')).toBe(true);
  });
});

describe('createBlog sync API', () => {
  const blog = createBlog({ contentDir, siteUrl: 'https://example.com' });

  it('getPostsSync returns published posts with zero awaits', () => {
    const posts = blog.getPostsSync();
    expect(posts.length).toBe(2);
    expect(posts.every(p => !p.draft)).toBe(true);
  });

  it('sync and async variants return the same cached array', async () => {
    expect(await blog.getPosts()).toBe(blog.getPostsSync());
  });

  it('getPostBySlugSync returns the post or throws PostNotFoundError', () => {
    expect(blog.getPostBySlugSync('hello-world').title).toBe('Hello World');
    expect(() => blog.getPostBySlugSync('nonexistent')).toThrow(PostNotFoundError);
  });

  it('findPostBySlugSync returns the post or null', () => {
    expect(blog.findPostBySlugSync('hello-world')?.title).toBe('Hello World');
    expect(blog.findPostBySlugSync('nonexistent')).toBeNull();
  });

  it('query variants filter synchronously', () => {
    expect(blog.getPostsByCategorySync('TypeScript').length).toBe(1);
    expect(blog.getPostsByTagSync('intro').length).toBe(1);
    expect(blog.getFeaturedPostsSync().every(p => p.featured)).toBe(true);
    expect(blog.searchSync('TypeScript').length).toBe(1);
    expect(blog.getCategoriesSync()).toContain('TypeScript');
    expect(blog.getTagsSync()).toContain('intro');
  });

  it('getAdjacentPostsSync and getRelatedPostsSync work synchronously', () => {
    const { prev, next } = blog.getAdjacentPostsSync('typescript-tips');
    expect(prev).toBeNull();
    expect(next?.slug).toBe('hello-world');
    expect(Array.isArray(blog.getRelatedPostsSync('hello-world'))).toBe(true);
  });

  it('generators produce output synchronously', () => {
    expect(blog.generateRssSync({ title: 'T', description: 'D' })).toContain('<rss');
    expect(blog.generateSitemapSync()).toContain('<urlset');
    expect(blog.generateLlmsTxtSync({ filter: () => true })).toContain('Hello World');
    expect(blog.generateSearchIndexSync().length).toBe(2);
  });

  it('validateContentSync parses all posts including drafts', () => {
    expect(blog.validateContentSync().length).toBe(3);
  });
});

describe('createBlog dev-mode cache', () => {
  it('reloads posts when content changes, reuses the cache otherwise', async () => {
    const { mkdtempSync, writeFileSync, utimesSync } = await import('fs');
    const { tmpdir } = await import('os');
    const dir = mkdtempSync(join(tmpdir(), 'yamblog-dev-'));
    const post = (title: string) => `---\ntitle: ${title}\ndate: 2024-01-01\n---\nbody`;
    writeFileSync(join(dir, 'a.md'), post('A'));

    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const b = createBlog({ contentDir: dir });
      const first = await b.getPosts();
      expect(first.length).toBe(1);
      // Unchanged content — same cached array instance
      expect(await b.getPosts()).toBe(first);

      writeFileSync(join(dir, 'b.md'), post('B'));
      // Ensure the new file's mtime is distinguishable
      utimesSync(join(dir, 'b.md'), new Date(), new Date(Date.now() + 1000));
      const second = await b.getPosts();
      expect(second.length).toBe(2);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});
