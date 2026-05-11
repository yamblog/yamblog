import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parsePost } from './parser.js';
import { defaultSlugify } from './utils.js';
import type { Post, BlogConfig, AdjacentPosts } from './types.js';

/**
 * Reads all .md files from contentDir, parses them, filters drafts, and sorts.
 * This is the single source of truth — all other query functions operate on
 * the loaded array rather than re-reading the filesystem.
 */
export async function loadAllPosts(config: BlogConfig): Promise<Post[]> {
  const { contentDir } = config;
  const slugify = config.slugify ?? defaultSlugify;
  const sortBy = config.sortBy ?? ((a, b) => b.date.getTime() - a.date.getTime());
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

export async function loadPosts(config: BlogConfig): Promise<Post[]> {
  const posts = await loadAllPosts(config);
  return posts.filter(post => !post.draft);
}

export function getPostBySlug(posts: Post[], slug: string): Post {
  const post = posts.find(p => p.slug === slug);
  if (!post) throw new Error(`Post not found: ${slug}`);
  return post;
}

export function getPostsByCategory(posts: Post[], category: string): Post[] {
  return posts.filter(p => p.category === category);
}

export function getPostsByTag(posts: Post[], tag: string): Post[] {
  return posts.filter(p => p.tags.includes(tag));
}

export function getFeaturedPosts(posts: Post[]): Post[] {
  return posts.filter(p => p.featured);
}

export function getCategories(posts: Post[]): string[] {
  return [...new Set(posts.map(p => p.category).filter(Boolean) as string[])];
}

export function getTags(posts: Post[]): string[] {
  return [...new Set(posts.flatMap(p => p.tags))];
}

export function getAdjacentPosts(posts: Post[], slug: string): AdjacentPosts {
  const index = posts.findIndex(p => p.slug === slug);
  if (index === -1) throw new Error(`Post not found: ${slug}`);
  return {
    prev: index > 0 ? posts[index - 1] : null,
    next: index < posts.length - 1 ? posts[index + 1] : null,
  };
}
