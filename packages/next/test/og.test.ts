import { describe, it, expect, mock } from 'bun:test';
import { PostNotFoundError } from '@yamblog/core';
import type { Blog, Post } from '@yamblog/core';

// @vercel/og only loads through a bundler; replace it with a stub that
// records what it was asked to render.
class FakeImageResponse extends Response {
  constructor(public element: unknown, public options: unknown) {
    super('png', { headers: { 'Content-Type': 'image/png' } });
  }
}
mock.module('@vercel/og', () => ({ ImageResponse: FakeImageResponse }));

const { createOgImageHandler } = await import('../src/og');

const post: Post = {
  id: 'blog-hello',
  slug: 'hello',
  title: 'Hello',
  date: new Date('2024-01-15'),
  excerpt: 'Hi',
  category: 'x',
  tags: [],
  author: 'Jane',
  featured: false,
  draft: false,
  content: 'Body',
  readingTime: 1,
};

const blog = {
  async getPostBySlug(slug: string) {
    if (slug === 'hello') return post;
    throw new PostNotFoundError(slug);
  },
} as unknown as Blog;

const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe('createOgImageHandler', () => {
  it('renders an image for a known slug', async () => {
    const res = await createOgImageHandler(blog, { siteName: 'My Blog' })(new Request('http://x'), ctx('hello'));
    expect(res).toBeInstanceOf(FakeImageResponse);
    expect((res as FakeImageResponse).options).toEqual({ width: 1200, height: 630 });
  });

  it('returns 404 (not a thrown 500) for an unknown slug', async () => {
    const res = await createOgImageHandler(blog)(new Request('http://x'), ctx('nope'));
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Not found');
  });

  it('uses a custom render callback', async () => {
    const element = { type: 'div' } as never;
    const res = await createOgImageHandler(blog, { render: () => element })(new Request('http://x'), ctx('hello'));
    expect((res as FakeImageResponse).element).toBe(element);
  });

  it('rethrows unexpected errors', async () => {
    const broken = { async getPostBySlug() { throw new Error('disk on fire'); } } as unknown as Blog;
    await expect(createOgImageHandler(broken)(new Request('http://x'), ctx('hello'))).rejects.toThrow('disk on fire');
  });
});
