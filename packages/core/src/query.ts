import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { parsePost } from './parser.js';
import { defaultSlugify } from './utils.js';
import { PostNotFoundError } from './errors.js';
import type { Post, BlogConfig, AdjacentPosts } from './types.js';
import { defaultSchema } from './types.js';

/**
 * Reads all .md files from contentDir, parses them, and sorts.
 * This is the single source of truth — all other query functions operate on
 * the loaded array rather than re-reading the filesystem. The work is
 * entirely synchronous (local file reads + parsing); the async `loadAllPosts`
 * is a thin wrapper for API compatibility.
 */
export function loadAllPostsSync<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  config: BlogConfig<TSchema>,
): Post<TSchema>[] {
  const { contentDir } = config;
  const slugify = config.slugify ?? defaultSlugify;
  const sortBy = config.sortBy ?? ((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());
  const schema = config.schema;

  let files: string[];
  try {
    files = readdirSync(contentDir).filter((f: string) => /\.mdx?$/.test(f));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`yamblog: content directory not found: "${contentDir}"`);
    }
    throw err;
  }

  const posts = files.map((filename: string) => {
    const slug = slugify(filename);
    if (!slug) {
      throw new Error(
        `yamblog: filename "${filename}" produced an empty slug — rename the file to include URL-safe characters, or pass a custom slugify()`,
      );
    }
    const raw = readFileSync(join(contentDir, filename), 'utf-8');
    return parsePost(raw, slug, schema);
  });

  const seenSlugs = new Set<string>();
  for (const post of posts) {
    if (seenSlugs.has(post.slug)) {
      throw new Error(`Duplicate post slug: ${post.slug}`);
    }
    seenSlugs.add(post.slug);
  }

  return posts.sort(sortBy);
}

export async function loadAllPosts<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  config: BlogConfig<TSchema>,
): Promise<Post<TSchema>[]> {
  return loadAllPostsSync(config);
}

/**
 * Cheap fingerprint of the content directory — filenames plus mtimes, no file
 * reads or parsing. Used to decide when the dev-mode posts cache is stale.
 */
export function contentSignature(contentDir: string): string {
  try {
    return readdirSync(contentDir)
      .filter((f: string) => /\.mdx?$/.test(f))
      .map((f: string) => `${f}:${statSync(join(contentDir, f)).mtimeMs}`)
      .join('|');
  } catch {
    // Missing/unreadable dir — loadPosts will surface the real error
    return 'unreadable';
  }
}

export function loadPostsSync<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  config: BlogConfig<TSchema>,
): Post<TSchema>[] {
  const posts = loadAllPostsSync(config);
  if (config.includeDrafts) return posts;
  return posts.filter(post => !(post as Post).draft);
}

export async function loadPosts<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  config: BlogConfig<TSchema>,
): Promise<Post<TSchema>[]> {
  return loadPostsSync(config);
}

export function getPostBySlug<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  posts: Post<TSchema>[],
  slug: string,
): Post<TSchema> {
  const post = findPostBySlug(posts, slug);
  if (!post) throw new PostNotFoundError(slug);
  return post;
}

export function findPostBySlug<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  posts: Post<TSchema>[],
  slug: string,
): Post<TSchema> | null {
  return posts.find(p => p.slug === slug) ?? null;
}

export function getPostsByCategory<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  posts: Post<TSchema>[],
  category: string,
): Post<TSchema>[] {
  return posts.filter(p => (p as Post).category === category);
}

export function getPostsByTag<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  posts: Post<TSchema>[],
  tag: string,
): Post<TSchema>[] {
  return posts.filter(p => (p as Post).tags.includes(tag));
}

export function getFeaturedPosts<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  posts: Post<TSchema>[],
): Post<TSchema>[] {
  return posts.filter(p => (p as Post).featured);
}

export function getCategories<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  posts: Post<TSchema>[],
): string[] {
  return [...new Set(posts.map(p => (p as Post).category).filter(Boolean) as string[])];
}

export function getTags<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  posts: Post<TSchema>[],
): string[] {
  return [...new Set(posts.flatMap(p => (p as Post).tags))];
}

export function getAdjacentPosts<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  posts: Post<TSchema>[],
  slug: string,
): AdjacentPosts<TSchema> {
  const index = posts.findIndex(p => p.slug === slug);
  if (index === -1) throw new PostNotFoundError(slug);
  return {
    prev: index > 0 ? posts[index - 1]! : null,
    next: index < posts.length - 1 ? posts[index + 1]! : null,
  };
}
