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

// A parsed blog post — frontmatter fields merged with system fields
export type Post = DefaultFrontmatter & {
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

export type AdjacentPosts = {
  prev: Post | null;
  next: Post | null;
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

export type RelatedPostsConfig = {
  /** Max related posts to return. Default: 3 */
  limit?: number;
  /** Built-in strategy. Default: 'tags+category' */
  strategy?: 'tags' | 'category' | 'tags+category';
  /** Custom scorer — overrides strategy when provided */
  scorer?: (current: Post, candidate: Post) => number;
};

export type BlogConfig = {
  /** Path to the directory containing .md files */
  contentDir: string;
  /** Site URL used as the base for RSS, sitemap, and JSON-LD links */
  siteUrl?: string;
  /** Zod schema for frontmatter validation. Defaults to defaultSchema */
  schema?: z.ZodObject<z.ZodRawShape>;
  /** Custom sort function. Default: newest first */
  sortBy?: (a: Post, b: Post) => number;
  /** Custom slug generator. Default: strips .md extension */
  slugify?: (filename: string) => string;
  /** Related posts configuration */
  relatedPosts?: RelatedPostsConfig;
};

// Return type of createBlog()
export type Blog = {
  /** Site URL provided in config, or auto-detected by defineBlog() */
  siteUrl: string;
  /** Validates content directory, parses all markdown files, and throws on invalid content */
  validateContent: () => Promise<Post[]>;
  getPosts: () => Promise<Post[]>;
  getPostBySlug: (slug: string) => Promise<Post>;
  getPostsByCategory: (category: string) => Promise<Post[]>;
  getPostsByTag: (tag: string) => Promise<Post[]>;
  getFeaturedPosts: () => Promise<Post[]>;
  search: (query: string) => Promise<Post[]>;
  getAdjacentPosts: (slug: string) => Promise<AdjacentPosts>;
  getRelatedPosts: (slug: string) => Promise<Post[]>;
  getCategories: () => Promise<string[]>;
  getTags: () => Promise<string[]>;
  generateRss: (options: RssOptions) => Promise<string>;
  generateSitemap: (options?: SitemapOptions) => Promise<string>;
  generateLlmsTxt: (options?: LlmsTxtOptions) => Promise<string>;
  generateSearchIndex: () => Promise<SearchIndexEntry[]>;
};
