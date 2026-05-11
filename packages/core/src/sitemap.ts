import type { Post, SitemapOptions } from './types.js';

/**
 * Generates a sitemap XML string for the given posts.
 * Post URLs are constructed as: {siteUrl}/blog/{slug}
 */
export function generateSitemap(posts: Post[], options: SitemapOptions): string {
  const { siteUrl } = options;

  const urls = posts
    .map(post => {
      const url = `${siteUrl}/blog/${post.slug}`;
      const lastmod = post.date.toISOString().split('T')[0]; // YYYY-MM-DD
      return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
