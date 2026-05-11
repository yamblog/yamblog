import type { Blog } from '@yamblog/core';

/**
 * Generates the static params array for Next.js App Router dynamic routes.
 *
 * @example
 * // app/blog/[slug]/page.tsx
 * export { generateStaticParams } from '@yamblog/next';
 * // or with a custom blog instance:
 * export async function generateStaticParams() {
 *   return createStaticParams(blog);
 * }
 */
export async function createStaticParams(blog: Blog): Promise<{ slug: string }[]> {
  const posts = await blog.getPosts();
  return posts.map(post => ({ slug: post.slug }));
}
