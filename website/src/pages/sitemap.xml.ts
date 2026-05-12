import type { APIRoute } from 'astro';
import { defineBlog } from '@yamblog/core';

const siteUrl = import.meta.env.SITE ?? 'https://yamblog.dev';

const staticPaths = [
  '/',
  '/blog',
  '/getting-started/',
  '/architecture/',
  '/extensibility/',
  '/ai-agent-authoring/',
  '/prompt-for-llms/',
  '/llms-txt/',
  '/recipes/astro/',
  '/recipes/nextjs/',
  '/recipes/react/',
];

export const GET: APIRoute = async () => {
  const blog = defineBlog('content/posts', siteUrl);
  const posts = await blog.getPosts();

  const urls = [
    ...staticPaths.map((path) => `${siteUrl}${path}`),
    ...posts.map((post) => `${siteUrl}/blog/${post.slug}`),
  ];

  const updatedAt = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((url) => `  <url><loc>${url}</loc><lastmod>${updatedAt}</lastmod></url>`)
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
};
