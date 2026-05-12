import { z } from 'zod';
import { loadAllPosts, loadPosts, getPostBySlug, getPostsByCategory, getPostsByTag, getFeaturedPosts, getCategories, getTags, getAdjacentPosts } from './query.js';
import { searchPosts } from './search.js';
import { getRelatedPosts } from './related.js';
import { generateRss } from './rss.js';
import { generateSitemap } from './sitemap.js';
import { generateLlmsTxt } from './llms.js';
import { defaultSchema } from './types.js';
import type { Blog, BlogConfig, Post, RssOptions, SitemapOptions, LlmsTxtOptions } from './types.js';

export function createBlog<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  config: BlogConfig<TSchema>,
): Blog<TSchema> {
  // Cache the promise so the filesystem is read only once per blog instance
  let postsCache: Promise<Post<TSchema>[]> | null = null;
  const getCachedPosts = () => {
    postsCache ??= loadPosts(config);
    return postsCache;
  };

  return {
    siteUrl: config.siteUrl ?? '',

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
      return generateRss(posts as Post[], { siteUrl: config.siteUrl ?? '', ...options });
    },

    async generateSitemap(options: SitemapOptions = {}) {
      const posts = await getCachedPosts();
      return generateSitemap(posts as Post[], { siteUrl: config.siteUrl ?? '', ...options });
    },

    async generateLlmsTxt(options: LlmsTxtOptions = {}) {
      const posts = await getCachedPosts();
      return generateLlmsTxt(posts as Post[], { siteUrl: config.siteUrl ?? '', ...options });
    },

    async generateSearchIndex() {
      const posts = await getCachedPosts();
      return (posts as Post[]).map(post => ({
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
