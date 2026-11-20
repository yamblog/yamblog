import { describe, it, expect } from 'bun:test';
import { createRssHandler } from '../src/rss';
import type { Blog, RssOptions } from '@yamblog/core';

describe('createRssHandler', () => {
  it('returns the blog RSS with XML headers', async () => {
    let received: RssOptions | undefined;
    const blog = {
      async generateRss(opts: RssOptions) {
        received = opts;
        return '<rss/>';
      },
    } as unknown as Blog;
    const opts = { title: 'T', description: 'D', siteUrl: 'https://example.com' };
    const res = await createRssHandler(blog, opts)();
    expect(received).toEqual(opts);
    expect(res.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('s-maxage=3600, stale-while-revalidate');
    expect(await res.text()).toBe('<rss/>');
  });
});
