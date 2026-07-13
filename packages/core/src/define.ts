import { z } from 'zod';
import { join, isAbsolute } from 'path';
import { createBlog } from './blog.js';
import { defaultSchema } from './types.js';
import type { Blog, BlogConfig } from './types.js';

export type DefineBlogConfig<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema> =
  Omit<BlogConfig<TSchema>, 'contentDir'> & {
    contentDir?: string;
  };

const DEFAULT_CONTENT_DIR = 'src/content/posts';

/**
 * Detects the site URL from common environment variables.
 * Priority: SITE → PUBLIC_SITE_URL → NEXT_PUBLIC_BASE_URL → VERCEL_URL → ''
 */
function detectSiteUrl(): string {
  if (process.env.SITE) return process.env.SITE;
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return '';
}

function resolveContentDir(contentDir: string): string {
  return isAbsolute(contentDir)
    ? contentDir
    : join(/* turbopackIgnore: true */ process.cwd(), contentDir);
}

/**
 * Creates a blog instance with sensible defaults.
 *
 * - Content dir defaults to `src/content/posts` relative to cwd
 * - Site URL is auto-detected from SITE / PUBLIC_SITE_URL / NEXT_PUBLIC_BASE_URL / VERCEL_URL
 * - Pass a custom Zod schema to add typed custom frontmatter fields
 * - Every method has a synchronous twin (`getPostsSync`, …) for Pages Router,
 *   module-scope constants, and standalone build scripts
 *
 * @example
 * // zero config — returns Blog<typeof defaultSchema>
 * export const blog = defineBlog();
 *
 * @example
 * // custom content dir — returns Blog<typeof defaultSchema>
 * export const blog = defineBlog('content/posts');
 *
 * @example
 * // custom schema — the schema's fields are baked into the returned Post
 * // type, so custom frontmatter is fully typed with no casts:
 * const projectSchema = defaultSchema.extend({
 *   company: z.string(),
 *   technologies: z.array(z.string()),
 * });
 * export const projects = defineBlog({ contentDir: 'content/projects', schema: projectSchema });
 *
 * const p = await projects.getPostBySlug('acme');
 * p.company;      // string — typed, no `as` cast
 * p.technologies; // string[]
 *
 * @example
 * // sync API — zero await, zero Promise types (build scripts, Pages Router)
 * const blog = defineBlog('content/posts');
 * const posts = blog.getPostsSync();
 * const rss = blog.generateRssSync({ title: 'My Blog', description: '…' });
 */
export function defineBlog(): Blog<typeof defaultSchema>;
export function defineBlog(contentDir: string, siteUrl?: string): Blog<typeof defaultSchema>;
export function defineBlog<TSchema extends z.ZodObject<z.ZodRawShape>>(
  config: DefineBlogConfig<TSchema>,
): Blog<TSchema>;
// Implementation — overload signatures above are the public contract
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineBlog(first?: any, second?: string): Blog<any> {
  if (first === undefined) {
    return createBlog({
      contentDir: resolveContentDir(DEFAULT_CONTENT_DIR),
      siteUrl: detectSiteUrl(),
    });
  }

  if (typeof first === 'string') {
    return createBlog({
      contentDir: resolveContentDir(first),
      siteUrl: second ?? detectSiteUrl(),
    });
  }

  const { contentDir = DEFAULT_CONTENT_DIR, siteUrl, ...rest } = first;
  return createBlog({
    ...rest,
    contentDir: resolveContentDir(contentDir),
    siteUrl: siteUrl ?? detectSiteUrl(),
  });
}
