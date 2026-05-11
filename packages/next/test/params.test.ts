import { describe, it, expect } from 'bun:test';
import { createStaticParams } from '../src/params';
import type { Blog, Post } from '@yamblog/core';

const mockPosts: Post[] = [
  {
    id: 'blog-hello-world',
    slug: 'hello-world',
    title: 'Hello World',
    date: new Date('2024-01-15'),
    tags: [],
    author: 'Anonymous',
    featured: false,
    draft: false,
    content: '',
    readingTime: 1,
  },
  {
    id: 'blog-typescript-tips',
    slug: 'typescript-tips',
    title: 'TypeScript Tips',
    date: new Date('2024-02-01'),
    tags: [],
    author: 'Anonymous',
    featured: false,
    draft: false,
    content: '',
    readingTime: 2,
  },
];

const mockBlog = {
  getPosts: async () => mockPosts,
} as unknown as Blog;

describe('createStaticParams', () => {
  it('returns one entry per published post', async () => {
    const params = await createStaticParams(mockBlog);
    expect(params).toHaveLength(2);
  });

  it('each entry has a slug field', async () => {
    const params = await createStaticParams(mockBlog);
    expect(params[0]).toEqual({ slug: 'hello-world' });
    expect(params[1]).toEqual({ slug: 'typescript-tips' });
  });
});
