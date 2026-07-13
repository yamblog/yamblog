import { loadAllPostsSync } from './query.js';
import type { BlogConfig, Post } from './types.js';

/**
 * Validates the configured content directory by attempting to load and parse
 * every markdown post using the same schema and slug rules as createBlog().
 * Throws when the directory is missing, frontmatter is invalid, or slugs collide.
 */
export function validateContentSync(config: BlogConfig): Post[] {
  return loadAllPostsSync(config);
}

/** Async variant of {@link validateContentSync}. */
export async function validateContent(config: BlogConfig): Promise<Post[]> {
  return validateContentSync(config);
}
