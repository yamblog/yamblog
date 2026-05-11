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
 * Post URLs are constructed as: {siteUrl}/blog/{slug}
 */
export function generateRss(posts: Post[], options: RssOptions): string {
  const { siteUrl, title, description, author } = options;
  const blogUrl = `${siteUrl}/blog`;

  const items = posts
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

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${blogUrl}</link>
    <description>${escapeXml(description)}</description>
    <language>en-us</language>
${items}
  </channel>
</rss>`;
}
