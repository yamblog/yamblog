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

// Han ideographs, Hiragana and Katakana: scripts written without spaces
// between words, so whitespace-splitting counts a whole paragraph as one word.
// (Hangul is word-spaced and is counted by the whitespace rule.)
const CJK_CHAR = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;
/** Characters per minute used for Chinese/Japanese text. */
const CJK_CHARS_PER_MINUTE = 500;

/**
 * Estimates reading time in minutes at 200 WPM, minimum 1 minute.
 * Chinese/Japanese characters (written without spaces) are counted
 * separately at ~500 characters per minute; text without them uses the
 * plain 200 WPM word count.
 */
export function readingTime(content: string): number {
  const cjkChars = content.match(CJK_CHAR)?.length ?? 0;
  if (cjkChars === 0) {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }
  // Remaining words (Latin, numbers, …), ignoring punctuation-only tokens
  // such as 。 left between CJK characters
  const words = content
    .replace(CJK_CHAR, ' ')
    .split(/\s+/)
    .filter(token => /[\p{L}\p{N}]/u.test(token)).length;
  return Math.max(1, Math.ceil(words / 200 + cjkChars / CJK_CHARS_PER_MINUTE));
}

/**
 * Default slug generator — strips .md/.mdx extensions and sanitizes the
 * result into a URL-safe slug: lowercased, whitespace and underscores
 * become dashes, and characters outside [a-z0-9-] are removed.
 * "My Post.md" → "my-post"
 *
 * Filenames with no ASCII letters or digits at all (e.g. "日本語.md"), which
 * would otherwise produce an empty slug, keep their Unicode letters and
 * digits instead: "日本語.md" → "日本語".
 */
export function defaultSlugify(filename: string): string {
  const base = filename.replace(/\.mdx?$/, '').toLowerCase();
  const ascii = base
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (ascii) return ascii;
  return base
    .normalize('NFC')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{M}\p{N}-]/gu, '')
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

// Code points that are not allowed anywhere in an XML 1.0 document, not even
// as character references: C0 controls other than tab/LF/CR, U+FFFE/U+FFFF,
// and unpaired UTF-16 surrogates.
const XML_ILLEGAL =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/**
 * Escapes a string for XML text or attribute content and strips characters
 * that XML 1.0 does not allow (so one stray control character cannot make a
 * whole feed or sitemap unparseable).
 * @internal Used by the RSS and sitemap generators.
 */
export function escapeXml(str: string): string {
  return str
    .replace(XML_ILLEGAL, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Serializes a value as JSON that is safe to embed inside
 * `<script type="application/ld+json">`: `<`, `>`, `&`, U+2028 and U+2029
 * are written as `\uXXXX` escapes, so content such as `</script>` in a post
 * title cannot close the script element. The result is still valid JSON and
 * parses back to the same value. Values JSON cannot represent at the top
 * level (`undefined`, functions, symbols) serialize as `null`.
 */
export function serializeJsonLd(value: unknown): string {
  const json = JSON.stringify(value) ?? 'null';
  return json.replace(/[<>&\u2028\u2029]/g, ch =>
    `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

const warnedRelativeSiteUrl = new Set<string>();

/**
 * Warns once per generator and site URL when the site URL is missing or not an absolute
 * http(s) URL: RSS readers and search engines need absolute links, so the
 * output would be unusable. A warning rather than an error keeps existing
 * builds working.
 * @internal
 */
export function warnIfRelativeSiteUrl(siteUrl: string, generator: string): void {
  const key = `${generator}\u0000${siteUrl}`;
  if (/^https?:\/\/[^/]/i.test(siteUrl) || warnedRelativeSiteUrl.has(key)) return;
  warnedRelativeSiteUrl.add(key);
  console.warn(
    `yamblog: ${generator}() is building links without an absolute site URL ` +
      `(siteUrl is ${siteUrl ? `"${siteUrl}"` : 'empty'}), so the output contains relative URLs. ` +
      'Set siteUrl in createBlog()/defineBlog() or pass it to the generator.',
  );
}
