import type { APIRoute } from 'astro';
import { blog } from '../lib/blog';

export const GET: APIRoute = async () => {
  const xml = await blog.generateRss({
    title: 'Yamblog Blog',
    description: 'Product notes, implementation details, and demos from the Yamblog project.',
  });

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
};
