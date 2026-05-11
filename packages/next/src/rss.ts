import type { Blog, RssOptions } from '@yamblog/core';

export function createRssHandler(blog: Blog, options: RssOptions) {
  return async function GET() {
    const xml = await blog.generateRss(options);
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  };
}
