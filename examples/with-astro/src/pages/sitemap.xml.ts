import type { APIRoute } from 'astro';
import { blog } from '../lib/blog';

export const GET: APIRoute = async () => {
  const xml = await blog.generateSitemap();

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
