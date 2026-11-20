import type { APIRoute } from 'astro';
import { blog } from '../lib/blog';

// Prerendered to dist/feed.xml at build time. Response headers other than the
// content type are dropped for static files, so configure caching on your host.
export const GET: APIRoute = async () => {
  const xml = await blog.generateRss({
    title: 'Yamblog Astro Example',
    description: 'A blog powered by @yamblog/astro',
  });

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
