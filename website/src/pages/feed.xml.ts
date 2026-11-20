import type { APIRoute } from 'astro';
import { blog } from '../lib/blog';
import { canonicalizeFeedLinks } from '../lib/urls';

// Prerendered to a static file, so response headers set here are dropped.
// Caching for /feed.xml is configured in public/_headers.
export const GET: APIRoute = async () => {
  const posts = await blog.getPosts();
  const xml = await blog.generateRss({
    title: 'Yamblog Blog',
    description: 'Product notes, implementation details, and demos from the Yamblog project.',
  });

  return new Response(
    canonicalizeFeedLinks(xml, blog.siteUrl, posts.map((post) => post.slug)),
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
