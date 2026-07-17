import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { blog } from '../lib/blog';

export const GET: APIRoute = async () => {
  const siteUrl = blog.siteUrl;
  const posts = await blog.getPosts();
  const docs = await getCollection('docs');

  const entries: { loc: string; lastmod?: string }[] = [
    { loc: `${siteUrl}/` },
    { loc: `${siteUrl}/blog/` },
    ...docs.map((doc) => ({ loc: `${siteUrl}/${doc.id}/` })),
    ...posts.map((post) => ({
      loc: `${siteUrl}/blog/${post.slug}/`,
      lastmod: post.date.toISOString().slice(0, 10),
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    ({ loc, lastmod }) =>
      `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
};
