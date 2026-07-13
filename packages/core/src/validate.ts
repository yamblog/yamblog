import { z } from 'zod';
import { loadAllPostsSync } from './query.js';
import { defaultSchema } from './types.js';
import type { BlogConfig, Post } from './types.js';

/**
 * Validates the configured content directory by attempting to load and parse
 * every markdown post using the same schema and slug rules as createBlog().
 * Throws when the directory is missing, frontmatter is invalid, or slugs collide.
 */
export function validateContentSync<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  config: BlogConfig<TSchema>,
): Post<TSchema>[] {
  return loadAllPostsSync(config);
}

/** Async variant of {@link validateContentSync}. */
export async function validateContent<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  config: BlogConfig<TSchema>,
): Promise<Post<TSchema>[]> {
  return validateContentSync(config);
}
