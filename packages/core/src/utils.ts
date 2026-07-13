import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

/**
 * Resolves a path relative to the calling ESM module's location.
 * Replaces the `dirname(fileURLToPath(import.meta.url))` pattern.
 *
 * @example
 * import { createBlog, resolvePath } from '@yamblog/core';
 * const blog = createBlog({ contentDir: resolvePath(import.meta.url, '../content/posts') });
 */
export function resolvePath(metaUrl: string, ...paths: string[]): string {
  return join(dirname(fileURLToPath(metaUrl)), ...paths);
}

/**
 * Estimates reading time in minutes at 200 WPM, minimum 1 minute.
 */
export function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Default slug generator — strips .md/.mdx extensions and sanitizes the
 * result into a URL-safe slug: lowercased, whitespace and underscores
 * become dashes, and characters outside [a-z0-9-] are removed.
 * "My Post.md" → "my-post"
 */
export function defaultSlugify(filename: string): string {
  return filename
    .replace(/\.mdx?$/, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Normalizes a URL path prefix: ensures a single leading slash and no
 * trailing slash. '' and '/' both normalize to '' (site root).
 */
export function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : '';
}

/** Default URL path prefix under which posts are served. */
export const DEFAULT_BASE_PATH = '/blog';

/**
 * Strips trailing slashes from a site URL so joins never double a slash.
 * 'https://example.com/' → 'https://example.com'
 */
export function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.replace(/\/+$/, '');
}

/**
 * Builds the canonical URL of a post: {siteUrl}{basePath}/{slug}.
 * The single source of truth for post URL construction — RSS, sitemap,
 * llms.txt, and the framework adapters all build links through this.
 * Both parts are normalized: a trailing slash on siteUrl and a missing or
 * trailing slash on basePath are tolerated. basePath defaults to '/blog'.
 */
export function buildPostUrl(siteUrl: string, basePath: string | undefined, slug: string): string {
  return `${normalizeSiteUrl(siteUrl)}${normalizeBasePath(basePath ?? DEFAULT_BASE_PATH)}/${slug}`;
}

/**
 * Generates a stable ID from a slug.
 * Format: "blog-{slug}" — safe to use as a foreign key in external services.
 */
export function generateId(slug: string): string {
  return `blog-${slug}`;
}
