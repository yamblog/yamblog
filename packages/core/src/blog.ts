import { z } from 'zod';
import { loadAllPostsSync, loadPostsSync, contentSignature, getPostBySlug, findPostBySlug, getPostsByCategory, getPostsByTag, getFeaturedPosts, getCategories, getTags, getAdjacentPosts } from './query.js';
import { normalizeBasePath } from './utils.js';
import { searchPosts } from './search.js';
import { getRelatedPosts } from './related.js';
import { generateRss } from './rss.js';
import { generateSitemap } from './sitemap.js';
import { generateLlmsTxt } from './llms.js';
import { defaultSchema } from './types.js';
import type { Blog, BlogConfig, Post, RssOptions, SitemapOptions, LlmsTxtOptions, SearchIndexOptions, SearchIndexEntry } from './types.js';

export function createBlog<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  config: BlogConfig<TSchema>,
): Blog<TSchema> {
  // The engine's work — reading local .md files, parsing, validating — is
  // entirely synchronous, so a sync core does everything and the async
  // methods are thin wrappers. Posts are read and parsed once per blog
  // instance; in development the cache is invalidated when the content
  // directory's file list or mtimes change, so edits show up without
  // restarting the dev server while repeated calls (metadata + page +
  // adjacent + related in one render) still share a single load.
  const isDev = process.env.NODE_ENV === 'development';
  let postsCache: Post<TSchema>[] | null = null;
  let cacheSignature: string | null = null;
  const getCachedPosts = (): Post<TSchema>[] => {
    if (isDev) {
      const signature = contentSignature(config.contentDir);
      if (postsCache === null || signature !== cacheSignature) {
        cacheSignature = signature;
        postsCache = loadPostsSync(config);
      }
      return postsCache;
    }
    postsCache ??= loadPostsSync(config);
    return postsCache;
  };

  const basePath = normalizeBasePath(config.basePath ?? '/blog');

  const validateContentSync = () => loadAllPostsSync(config);
  const getPostsSync = () => getCachedPosts();
  const getPostBySlugSync = (slug: string) => getPostBySlug(getCachedPosts(), slug);
  const findPostBySlugSync = (slug: string) => findPostBySlug(getCachedPosts(), slug);
  const getPostsByCategorySync = (category: string) => getPostsByCategory(getCachedPosts(), category);
  const getPostsByTagSync = (tag: string) => getPostsByTag(getCachedPosts(), tag);
  const getFeaturedPostsSync = () => getFeaturedPosts(getCachedPosts());
  const searchSync = (query: string) => searchPosts(getCachedPosts(), query);
  const getAdjacentPostsSync = (slug: string) => getAdjacentPosts(getCachedPosts(), slug);
  const getRelatedPostsSync = (slug: string) => getRelatedPosts(getCachedPosts(), slug, config.relatedPosts ?? {});
  const getCategoriesSync = () => getCategories(getCachedPosts());
  const getTagsSync = () => getTags(getCachedPosts());
  const generateRssSync = (options: RssOptions) =>
    generateRss(getCachedPosts() as Post[], { siteUrl: config.siteUrl ?? '', basePath, ...options });
  const generateSitemapSync = (options: SitemapOptions = {}) =>
    generateSitemap(getCachedPosts() as Post[], { siteUrl: config.siteUrl ?? '', basePath, ...options });
  const generateLlmsTxtSync = (options: LlmsTxtOptions = {}) =>
    generateLlmsTxt(getCachedPosts() as Post[], { siteUrl: config.siteUrl ?? '', basePath, ...options });
  const generateSearchIndexSync = (options: SearchIndexOptions = {}): SearchIndexEntry[] => {
    const posts = getCachedPosts() as Post[];
    const published = options.includeDrafts ? posts : posts.filter(post => !post.draft);
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
  };

  return {
    siteUrl: config.siteUrl ?? '',
    basePath,

    validateContentSync,
    getPostsSync,
    getPostBySlugSync,
    findPostBySlugSync,
    getPostsByCategorySync,
    getPostsByTagSync,
    getFeaturedPostsSync,
    searchSync,
    getAdjacentPostsSync,
    getRelatedPostsSync,
    getCategoriesSync,
    getTagsSync,
    generateRssSync,
    generateSitemapSync,
    generateLlmsTxtSync,
    generateSearchIndexSync,

    async validateContent() {
      return validateContentSync();
    },

    async getPosts() {
      return getPostsSync();
    },

    async getPostBySlug(slug: string) {
      return getPostBySlugSync(slug);
    },

    async findPostBySlug(slug: string) {
      return findPostBySlugSync(slug);
    },

    async getPostsByCategory(category: string) {
      return getPostsByCategorySync(category);
    },

    async getPostsByTag(tag: string) {
      return getPostsByTagSync(tag);
    },

    async getFeaturedPosts() {
      return getFeaturedPostsSync();
    },

    async search(query: string) {
      return searchSync(query);
    },

    async getAdjacentPosts(slug: string) {
      return getAdjacentPostsSync(slug);
    },

    async getRelatedPosts(slug: string) {
      return getRelatedPostsSync(slug);
    },

    async getCategories() {
      return getCategoriesSync();
    },

    async getTags() {
      return getTagsSync();
    },

    async generateRss(options: RssOptions) {
      return generateRssSync(options);
    },

    async generateSitemap(options: SitemapOptions = {}) {
      return generateSitemapSync(options);
    },

    async generateLlmsTxt(options: LlmsTxtOptions = {}) {
      return generateLlmsTxtSync(options);
    },

    async generateSearchIndex(options: SearchIndexOptions = {}) {
      return generateSearchIndexSync(options);
    },
  };
}
