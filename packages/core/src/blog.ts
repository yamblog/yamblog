import { z } from 'zod';
import { loadAllPostsSync, contentSignature, getPostBySlug, findPostBySlug, getPostsByCategory, getPostsByTag, getFeaturedPosts, getCategories, getTags, getAdjacentPosts } from './query.js';
import { normalizeBasePath } from './utils.js';
import { assertPostsHaveField } from './guards.js';
import { searchPosts } from './search.js';
import { getRelatedPosts } from './related.js';
import { generateRss } from './rss.js';
import { generateSitemap } from './sitemap.js';
import { generateLlmsTxt } from './llms.js';
import { defaultSchema } from './types.js';
import type { Blog, BlogConfig, Post, RssOptions, SitemapOptions, LlmsTxtOptions, SearchIndexOptions, SearchIndexEntry } from './types.js';

/** How long (ms) a dev-mode content-directory check is reused. */
const DEV_SIGNATURE_TTL_MS = 100;

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
  // Two caches over one load: `allPostsCache` keeps every non-draft-filtered
  // post so the artifact generators can honor their own `includeDrafts`
  // option regardless of the blog config; `queryPostsCache` is the
  // config-filtered view served to query methods.
  let allPostsCache: Post<TSchema>[] | null = null;
  let queryPostsCache: Post<TSchema>[] | null = null;
  let cacheSignature: string | null = null;
  // The signature costs a readdir plus a stat per post, and one render calls
  // several query methods; reuse the last check for a short window so a
  // burst of calls stats the directory once. Edits still show up on the next
  // request.
  let lastSignatureCheck = 0;
  const invalidateIfStale = () => {
    if (!isDev) return;
    const now = Date.now();
    if (cacheSignature !== null && now - lastSignatureCheck < DEV_SIGNATURE_TTL_MS) return;
    lastSignatureCheck = now;
    const signature = contentSignature(config.contentDir);
    if (signature !== cacheSignature) {
      cacheSignature = signature;
      allPostsCache = null;
      queryPostsCache = null;
    }
  };
  // Full post set minus nothing but sorting/validation — generators filter
  // drafts themselves based on their own options.
  const getAllPosts = (): Post<TSchema>[] => {
    invalidateIfStale();
    allPostsCache ??= loadAllPostsSync(config);
    return allPostsCache;
  };
  // Query view: drafts stripped unless the blog config opts in.
  const getCachedPosts = (): Post<TSchema>[] => {
    invalidateIfStale();
    queryPostsCache ??= config.includeDrafts
      ? getAllPosts()
      : getAllPosts().filter(post => !(post as Post).draft);
    return queryPostsCache;
  };

  const basePath = normalizeBasePath(config.basePath ?? '/blog');

  const validateContentSync = () => loadAllPostsSync(config);
  // A copy, so a caller's in-place sort()/reverse()/splice() cannot reorder
  // the shared cache for every later call (adjacent posts, RSS, sitemap, …).
  const getPostsSync = () => [...getCachedPosts()];
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
  // Resolve each field with `??` rather than spreading options over the
  // defaults: an explicit `siteUrl: undefined` (e.g. an unset env var) must
  // fall back to the config, not clobber it.
  const generateRssSync = (options: RssOptions) =>
    generateRss(getAllPosts() as Post[], {
      ...options,
      siteUrl: options.siteUrl ?? config.siteUrl ?? '',
      basePath: options.basePath ?? basePath,
    });
  const generateSitemapSync = (options: SitemapOptions = {}) =>
    generateSitemap(getAllPosts() as Post[], {
      ...options,
      siteUrl: options.siteUrl ?? config.siteUrl ?? '',
      basePath: options.basePath ?? basePath,
    });
  const generateLlmsTxtSync = (options: LlmsTxtOptions<TSchema> = {}) =>
    generateLlmsTxt<TSchema>(getAllPosts(), {
      ...options,
      siteUrl: options.siteUrl ?? config.siteUrl ?? '',
      basePath: options.basePath ?? basePath,
    });
  const generateSearchIndexSync = (options: SearchIndexOptions = {}): SearchIndexEntry[] => {
    const posts = getAllPosts() as Post[];
    const published = options.includeDrafts ? posts : posts.filter(post => !post.draft);
    assertPostsHaveField(published, 'date', 'generateSearchIndex()');
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

    async generateLlmsTxt(options: LlmsTxtOptions<TSchema> = {}) {
      return generateLlmsTxtSync(options);
    },

    async generateSearchIndex(options: SearchIndexOptions = {}) {
      return generateSearchIndexSync(options);
    },
  };
}
