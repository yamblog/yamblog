import { normalizeBasePath, DEFAULT_BASE_PATH } from './utils.js';
import type { Post, RssOptions } from './types.js';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates an RSS 2.0 XML string for the given posts.
 * Post URLs are constructed as: {siteUrl}{basePath}/{slug}
 * Draft posts are excluded unless `includeDrafts: true` is passed explicitly.
 */
export function generateRss(posts: Post[], options: RssOptions & { siteUrl: string }): string {
  const { siteUrl, title, description, author, language = 'en-us' } = options;
  const basePath = normalizeBasePath(options.basePath ?? DEFAULT_BASE_PATH);
  const blogUrl = `${siteUrl}${basePath}`;
  const feedUrl = options.feedUrl ?? `${siteUrl}/feed.xml`;
  const published = options.includeDrafts ? posts : posts.filter(post => !post.draft);

  const items = published
    .map(post => {
      const url = `${blogUrl}/${post.slug}`;
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${post.date.toUTCString()}</pubDate>
      ${post.excerpt ? `<description>${escapeXml(post.excerpt)}</description>` : ''}
      ${author ? `<author>${escapeXml(author)}</author>` : ''}
    </item>`;
    })
    .join('\n');

  // Posts are typically sorted newest-first, but don't rely on it
  const newest = published.reduce<Date | null>(
    (latest, post) => (!latest || post.date > latest ? post.date : latest),
    null,
  );
  const lastBuildDate = newest ? `\n    <lastBuildDate>${newest.toUTCString()}</lastBuildDate>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${blogUrl}</link>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
    <description>${escapeXml(description)}</description>
    <language>${escapeXml(language)}</language>${lastBuildDate}
${items}
  </channel>
</rss>`;
}
