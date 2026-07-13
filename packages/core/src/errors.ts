/**
 * Thrown by `getPostBySlug` and `getAdjacentPosts` when no post matches the
 * given slug.
 *
 * The message stays `"Post not found: {slug}"` for backward compatibility
 * with consumers that string-match, but prefer the typed checks:
 *
 * @example
 * try {
 *   const post = await blog.getPostBySlug(slug);
 * } catch (err) {
 *   if (err instanceof PostNotFoundError) return notFound(); // err.slug is typed
 *   throw err;
 * }
 *
 * // or skip try/catch entirely:
 * const post = await blog.findPostBySlug(slug); // Post | null
 */
export class PostNotFoundError extends Error {
  /** The slug that was looked up */
  readonly slug: string;

  constructor(slug: string) {
    super(`Post not found: ${slug}`);
    this.name = 'PostNotFoundError';
    this.slug = slug;
  }
}
