import { z } from 'zod';
import { loadAllPosts, loadPosts, contentSignature, getPostBySlug, findPostBySlug, getPostsByCategory, getPostsByTag, getFeaturedPosts, getCategories, getTags, getAdjacentPosts } from './query.js';
import { normalizeBasePath } from './utils.js';
import { searchPosts } from './search.js';
import { getRelatedPosts } from './related.js';
import { generateRss } from './rss.js';
import { generateSitemap } from './sitemap.js';
import { generateLlmsTxt } from './llms.js';
import { defaultSchema } from './types.js';
import type { Blog, BlogConfig, Post, RssOptions, SitemapOptions, LlmsTxtOptions, SearchIndexOptions } from './types.js';

export function createBlog<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  config: BlogConfig<TSchema>,
): Blog<TSchema> {
  // Cache the promise so the filesystem is read and parsed only once per blog
  // instance. In development the cache is invalidated when the content
  // directory's file list or mtimes change, so edits show up without
  // restarting the dev server while repeated calls (metadata + page +
  // adjacent + related in one render) still share a single load.
  const isDev = process.env.NODE_ENV === 'development';
  let postsCache: Promise<Post<TSchema>[]> | null = null;
  let cacheSignature: string | null = null;
  const getCachedPosts = () => {
    if (isDev) {
      const signature = contentSignature(config.contentDir);
      if (postsCache === null || signature !== cacheSignature) {
        cacheSignature = signature;
        postsCache = loadPosts(config);
      }
      return postsCache;
    }
    postsCache ??= loadPosts(config);
    return postsCache;
  };

  const basePath = normalizeBasePath(config.basePath ?? '/blog');

  return {
    siteUrl: config.siteUrl ?? '',
    basePath,

    async validateContent() {
      return loadAllPosts(config);
    },

    async getPosts() {
      return getCachedPosts();
    },

    async getPostBySlug(slug: string) {
      const posts = await getCachedPosts();
      return getPostBySlug(posts, slug);
    },

    async findPostBySlug(slug: string) {
      const posts = await getCachedPosts();
      return findPostBySlug(posts, slug);
    },

    async getPostsByCategory(category: string) {
      const posts = await getCachedPosts();
      return getPostsByCategory(posts, category);
    },

    async getPostsByTag(tag: string) {
      const posts = await getCachedPosts();
      return getPostsByTag(posts, tag);
    },

    async getFeaturedPosts() {
      const posts = await getCachedPosts();
      return getFeaturedPosts(posts);
    },

    async search(query: string) {
      const posts = await getCachedPosts();
      return searchPosts(posts, query);
    },

    async getAdjacentPosts(slug: string) {
      const posts = await getCachedPosts();
      return getAdjacentPosts(posts, slug);
    },

    async getRelatedPosts(slug: string) {
      const posts = await getCachedPosts();
      return getRelatedPosts(posts, slug, config.relatedPosts ?? {});
    },

    async getCategories() {
      const posts = await getCachedPosts();
      return getCategories(posts);
    },

    async getTags() {
      const posts = await getCachedPosts();
      return getTags(posts);
    },

    async generateRss(options: RssOptions) {
      const posts = await getCachedPosts();
      return generateRss(posts as Post[], { siteUrl: config.siteUrl ?? '', basePath, ...options });
    },

    async generateSitemap(options: SitemapOptions = {}) {
      const posts = await getCachedPosts();
      return generateSitemap(posts as Post[], { siteUrl: config.siteUrl ?? '', basePath, ...options });
    },

    async generateLlmsTxt(options: LlmsTxtOptions = {}) {
      const posts = await getCachedPosts();
      return generateLlmsTxt(posts as Post[], { siteUrl: config.siteUrl ?? '', basePath, ...options });
    },

    async generateSearchIndex(options: SearchIndexOptions = {}) {
      const posts = await getCachedPosts();
      const published = options.includeDrafts
        ? (posts as Post[])
        : (posts as Post[]).filter(post => !post.draft);
      return published.map(post => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        tags: post.tags,
        category: post.category,
        author: post.author,
        date: post.date.toISOString(),
        readingTime: post.readingTime,
      }));
    },
  };
}
