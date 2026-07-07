import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { parsePost } from './parser.js';
import { defaultSlugify } from './utils.js';
import type { Post, BlogConfig, AdjacentPosts } from './types.js';
import { defaultSchema } from './types.js';

/**
 * Reads all .md files from contentDir, parses them, filters drafts, and sorts.
 * This is the single source of truth — all other query functions operate on
 * the loaded array rather than re-reading the filesystem.
 */
export async function loadAllPosts<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  config: BlogConfig<TSchema>,
): Promise<Post<TSchema>[]> {
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

export async function loadPosts<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  config: BlogConfig<TSchema>,
): Promise<Post<TSchema>[]> {
  const posts = await loadAllPosts(config);
  if (config.includeDrafts) return posts;
  return posts.filter(post => !(post as Post).draft);
}

export function getPostBySlug<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  posts: Post<TSchema>[],
  slug: string,
): Post<TSchema> {
  const post = posts.find(p => p.slug === slug);
  if (!post) throw new Error(`Post not found: ${slug}`);
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
  if (index === -1) throw new Error(`Post not found: ${slug}`);
  return {
    prev: index > 0 ? posts[index - 1]! : null,
    next: index < posts.length - 1 ? posts[index + 1]! : null,
  };
}
