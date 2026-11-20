import { describe, it, expect, mock } from 'bun:test';
import { join } from 'path';
import { renderComponent } from './astro-render';

// Wraps @yamblog/remark's toHtml to observe what the component passes. The
// wrapper delegates to the real function, so other test files that share
// the module registry still see real rendering.
const remark = await import('@yamblog/remark');
const realToHtml = remark.toHtml;
const calls: Array<{ markdown: string; options: unknown }> = [];
mock.module('@yamblog/remark', () => ({
  ...remark,
  toHtml: async (markdown: string, options: Parameters<typeof realToHtml>[1]) => {
    calls.push({ markdown, options });
    return realToHtml(markdown, options);
  },
}));

const postPage = join(import.meta.dir, '../src/components/BlogPostPage.astro');
const post = {
  id: 'blog-x', slug: 'x', title: 'X', date: new Date('2024-01-15'),
  readingTime: 1, author: 'A', tags: [], featured: false, draft: false, content: 'body',
};

describe('BlogPostPage.astro sanitize prop', () => {
  it('passes sanitize: false to toHtml by default', async () => {
    calls.length = 0;
    await renderComponent(postPage, { post });
    expect(calls).toEqual([{ markdown: 'body', options: { sanitize: false } }]);
  });

  it('forwards sanitize: true to toHtml', async () => {
    calls.length = 0;
    const html = await renderComponent(postPage, { post, sanitize: true });
    expect(calls).toEqual([{ markdown: 'body', options: { sanitize: true } }]);
    expect(html).toContain('<p>body</p>');
  });
});
