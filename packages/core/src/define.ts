import { join, isAbsolute } from 'path';
import { createBlog } from './blog.js';
import type { Blog, BlogConfig } from './types.js';

export type DefineBlogConfig = Omit<BlogConfig, 'contentDir'> & {
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
 *
 * @example
 * // zero config
 * export const blog = defineBlog();
 *
 * @example
 * // custom content dir
 * export const blog = defineBlog('content/posts');
 *
 * @example
 * // content dir + site URL
 * export const blog = defineBlog('content/posts', 'https://my-site.com');
 *
 * @example
 * // full config object
 * export const blog = defineBlog({ contentDir: 'content/posts', siteUrl: 'https://my-site.com' });
 */
export function defineBlog(): Blog;
export function defineBlog(contentDir: string, siteUrl?: string): Blog;
export function defineBlog(config: DefineBlogConfig): Blog;
export function defineBlog(
  first?: string | DefineBlogConfig,
  second?: string,
): Blog {
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
