import { z } from 'zod';

// Default frontmatter schema — users can extend or replace this
export const defaultSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  excerpt: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  author: z.string().default('Anonymous'),
  coverImage: z.string().optional(),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
});

export type DefaultFrontmatter = z.infer<typeof defaultSchema>;

// A parsed blog post — schema fields merged with system fields.
// TSchema defaults to defaultSchema, so Post with no args is backward-compatible.
export type Post<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema> =
  z.infer<TSchema> & {
    /** Stable ID: "blog-{slug}" — safe to use as foreign key in external services */
    id: string;
    /** URL-safe slug derived from filename */
    slug: string;
    /** Raw markdown body (no frontmatter) */
    content: string;
    /** Estimated reading time in minutes at 200 WPM */
    readingTime: number;
  };

export type SearchIndexEntry = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  tags: string[];
  category?: string;
  author: string;
  date: string;
  readingTime: number;
};

export type AdjacentPosts<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema> = {
  prev: Post<TSchema> | null;
  next: Post<TSchema> | null;
};

export type RssOptions = {
  /** Falls back to siteUrl set in createBlog/defineBlog config */
  siteUrl?: string;
  /** URL path prefix for post links. Falls back to basePath set in config. Default: '/blog' */
  basePath?: string;
  title: string;
  description: string;
  /**
   * Feed author. Per the RSS 2.0 spec this should be an email address,
   * e.g. 'jane@example.com (Jane Doe)' — feed validators flag bare names.
   */
  author?: string;
  /** Channel language code. Default: 'en-us' */
  language?: string;
  /** Absolute URL of the feed itself, used for the atom:link self reference. Default: {siteUrl}/feed.xml */
  feedUrl?: string;
  /**
   * Include posts marked `draft: true` in the feed. Off by default even when
   * the blog is configured with `includeDrafts: true`, so preview deployments
   * don't publish drafts to feed readers.
   */
  includeDrafts?: boolean;
};

export type SitemapOptions = {
  /** Falls back to siteUrl set in createBlog/defineBlog config */
  siteUrl?: string;
  /** URL path prefix for post links. Falls back to basePath set in config. Default: '/blog' */
  basePath?: string;
  /**
   * Include posts marked `draft: true` in the sitemap. Off by default even
   * when the blog is configured with `includeDrafts: true`.
   */
  includeDrafts?: boolean;
};

export type LlmsTxtOptions = {
  /** Section heading. Default: 'Blog' */
  sectionTitle?: string;
  /** Falls back to siteUrl set in createBlog/defineBlog config */
  siteUrl?: string;
  /** URL path prefix for post links. Falls back to basePath set in config. Default: '/blog' */
  basePath?: string;
  /**
   * Filter which posts to include.
   * Default: (post) => post.featured === true
   * Pass () => true to include all posts.
   */
  filter?: (post: Post) => boolean;
  /**
   * Include posts marked `draft: true`. Off by default even when the blog
   * is configured with `includeDrafts: true`. Applied before `filter`.
   */
  includeDrafts?: boolean;
};

export type SearchIndexOptions = {
  /**
   * Include posts marked `draft: true` in the search index. Off by default
   * even when the blog is configured with `includeDrafts: true`.
   */
  includeDrafts?: boolean;
};

export type RelatedPostsConfig<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema> = {
  /** Max related posts to return. Default: 3 */
  limit?: number;
  /** Built-in strategy. Default: 'tags+category' */
  strategy?: 'tags' | 'category' | 'tags+category';
  /** Custom scorer — overrides strategy when provided */
  scorer?: (current: Post<TSchema>, candidate: Post<TSchema>) => number;
};

export type BlogConfig<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema> = {
  /** Path to the directory containing .md files */
  contentDir: string;
  /** Site URL used as the base for RSS, sitemap, and JSON-LD links */
  siteUrl?: string;
  /**
   * URL path prefix under which posts are served, used when building
   * RSS, sitemap, and llms.txt links. Use '' to mount posts at the site root.
   * Default: '/blog'
   */
  basePath?: string;
  /**
   * Include posts marked `draft: true` in query results (getPosts, search,
   * getRelatedPosts, …). Useful for previewing drafts in development.
   * Generated public artifacts — RSS, sitemap, llms.txt, and the search
   * index — still exclude drafts unless their own `includeDrafts` option is
   * set, so a preview deployment can't accidentally publish drafts.
   * Default: false
   */
  includeDrafts?: boolean;
  /** Zod schema for frontmatter validation. Defaults to defaultSchema */
  schema?: TSchema;
  /** Custom sort function. Default: newest first */
  sortBy?: (a: Post<TSchema>, b: Post<TSchema>) => number;
  /** Custom slug generator. Default: strips the extension and sanitizes into a URL-safe slug */
  slugify?: (filename: string) => string;
  /** Related posts configuration */
  relatedPosts?: RelatedPostsConfig<TSchema>;
};

// Return type of createBlog().
// Every method has a synchronous twin (`getPostsSync`, …): the engine's work —
// reading local .md files, parsing frontmatter, validating — is inherently
// synchronous, so the async methods are thin wrappers kept for compatibility.
// Use the sync variants in Pages Router `getStaticProps`, module-scope
// constants, and standalone build scripts.
export type Blog<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema> = {
  /** Site URL provided in config, or auto-detected by defineBlog() */
  siteUrl: string;
  /** Normalized URL path prefix for posts ('/blog' by default) */
  basePath: string;
  /** Validates content directory, parses all markdown files, and throws on invalid content */
  validateContent: () => Promise<Post<TSchema>[]>;
  validateContentSync: () => Post<TSchema>[];
  getPosts: () => Promise<Post<TSchema>[]>;
  getPostsSync: () => Post<TSchema>[];
  /** Returns the post with the given slug, or throws PostNotFoundError if it doesn't exist */
  getPostBySlug: (slug: string) => Promise<Post<TSchema>>;
  /** Returns the post with the given slug, or throws PostNotFoundError if it doesn't exist */
  getPostBySlugSync: (slug: string) => Post<TSchema>;
  /** Returns the post with the given slug, or null if it doesn't exist */
  findPostBySlug: (slug: string) => Promise<Post<TSchema> | null>;
  /** Returns the post with the given slug, or null if it doesn't exist */
  findPostBySlugSync: (slug: string) => Post<TSchema> | null;
  getPostsByCategory: (category: string) => Promise<Post<TSchema>[]>;
  getPostsByCategorySync: (category: string) => Post<TSchema>[];
  getPostsByTag: (tag: string) => Promise<Post<TSchema>[]>;
  getPostsByTagSync: (tag: string) => Post<TSchema>[];
  getFeaturedPosts: () => Promise<Post<TSchema>[]>;
  getFeaturedPostsSync: () => Post<TSchema>[];
  search: (query: string) => Promise<Post<TSchema>[]>;
  searchSync: (query: string) => Post<TSchema>[];
  getAdjacentPosts: (slug: string) => Promise<AdjacentPosts<TSchema>>;
  getAdjacentPostsSync: (slug: string) => AdjacentPosts<TSchema>;
  getRelatedPosts: (slug: string) => Promise<Post<TSchema>[]>;
  getRelatedPostsSync: (slug: string) => Post<TSchema>[];
  getCategories: () => Promise<string[]>;
  getCategoriesSync: () => string[];
  getTags: () => Promise<string[]>;
  getTagsSync: () => string[];
  generateRss: (options: RssOptions) => Promise<string>;
  generateRssSync: (options: RssOptions) => string;
  generateSitemap: (options?: SitemapOptions) => Promise<string>;
  generateSitemapSync: (options?: SitemapOptions) => string;
  generateLlmsTxt: (options?: LlmsTxtOptions) => Promise<string>;
  generateLlmsTxtSync: (options?: LlmsTxtOptions) => string;
  generateSearchIndex: (options?: SearchIndexOptions) => Promise<SearchIndexEntry[]>;
  generateSearchIndexSync: (options?: SearchIndexOptions) => SearchIndexEntry[];
};
