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
  title: string;
  description: string;
  author?: string;
};

export type SitemapOptions = {
  /** Falls back to siteUrl set in createBlog/defineBlog config */
  siteUrl?: string;
};

export type LlmsTxtOptions = {
  /** Section heading. Default: 'Blog' */
  sectionTitle?: string;
  /** Falls back to siteUrl set in createBlog/defineBlog config */
  siteUrl?: string;
  /**
   * Filter which posts to include.
   * Default: (post) => post.featured === true
   * Pass () => true to include all posts.
   */
  filter?: (post: Post) => boolean;
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
  /** Zod schema for frontmatter validation. Defaults to defaultSchema */
  schema?: TSchema;
  /** Custom sort function. Default: newest first */
  sortBy?: (a: Post<TSchema>, b: Post<TSchema>) => number;
  /** Custom slug generator. Default: strips .md extension */
  slugify?: (filename: string) => string;
  /** Related posts configuration */
  relatedPosts?: RelatedPostsConfig<TSchema>;
};

// Return type of createBlog()
export type Blog<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema> = {
  /** Site URL provided in config, or auto-detected by defineBlog() */
  siteUrl: string;
  /** Validates content directory, parses all markdown files, and throws on invalid content */
  validateContent: () => Promise<Post<TSchema>[]>;
  getPosts: () => Promise<Post<TSchema>[]>;
  getPostBySlug: (slug: string) => Promise<Post<TSchema>>;
  getPostsByCategory: (category: string) => Promise<Post<TSchema>[]>;
  getPostsByTag: (tag: string) => Promise<Post<TSchema>[]>;
  getFeaturedPosts: () => Promise<Post<TSchema>[]>;
  search: (query: string) => Promise<Post<TSchema>[]>;
  getAdjacentPosts: (slug: string) => Promise<AdjacentPosts<TSchema>>;
  getRelatedPosts: (slug: string) => Promise<Post<TSchema>[]>;
  getCategories: () => Promise<string[]>;
  getTags: () => Promise<string[]>;
  generateRss: (options: RssOptions) => Promise<string>;
  generateSitemap: (options?: SitemapOptions) => Promise<string>;
  generateLlmsTxt: (options?: LlmsTxtOptions) => Promise<string>;
  generateSearchIndex: () => Promise<SearchIndexEntry[]>;
};
