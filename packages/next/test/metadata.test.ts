import { describe, it, expect } from 'bun:test';
import { generatePostMetadata, generateBlogJsonLd, generateBreadcrumbJsonLd } from '../src/metadata';
import type { Post } from '@yamblog/core';

const mockPost: Post = {
  id: 'blog-hello-world',
  slug: 'hello-world',
  title: 'Hello World',
  date: new Date('2024-01-15'),
  excerpt: 'My first blog post',
  category: 'Getting Started',
  tags: ['intro'],
  author: 'Jane Doe',
  featured: true,
  draft: false,
  content: '# Hello World\n\nContent here.',
  readingTime: 1,
};

const siteUrl = 'https://example.com';

describe('generatePostMetadata', () => {
  it('includes title and description', () => {
    const meta = generatePostMetadata(mockPost, { siteUrl });
    expect(meta.title).toBe('Hello World');
    expect(meta.description).toBe('My first blog post');
  });

  it('includes canonical URL', () => {
    const meta = generatePostMetadata(mockPost, { siteUrl });
    expect((meta as any).alternates?.canonical).toContain('hello-world');
  });

  it('includes OpenGraph data', () => {
    const meta = generatePostMetadata(mockPost, { siteUrl });
    const og = (meta as any).openGraph;
    expect(og?.type).toBe('article');
    expect(og?.title).toBe('Hello World');
  });

  it('includes Twitter card data', () => {
    const meta = generatePostMetadata(mockPost, { siteUrl });
    const twitter = (meta as any).twitter;
    expect(twitter?.card).toBe('summary_large_image');
  });
});

describe('generateBlogJsonLd', () => {
  it('returns an Article schema', () => {
    const jsonld = generateBlogJsonLd(mockPost, { siteUrl });
    expect(jsonld['@type']).toBe('Article');
    expect(jsonld.headline).toBe('Hello World');
  });

  it('includes author name', () => {
    const jsonld = generateBlogJsonLd(mockPost, { siteUrl });
    expect(jsonld.author?.name).toBe('Jane Doe');
  });

  it('includes correct URL', () => {
    const jsonld = generateBlogJsonLd(mockPost, { siteUrl });
    expect(jsonld.url).toBe('https://example.com/blog/hello-world');
  });
});

describe('generateBreadcrumbJsonLd', () => {
  const items = [
    { name: 'Home', url: 'https://example.com' },
    { name: 'Blog', url: 'https://example.com/blog' },
    { name: 'Hello World', url: 'https://example.com/blog/hello-world' },
  ];

  it('returns a BreadcrumbList schema', () => {
    const schema = generateBreadcrumbJsonLd(items);
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema['@context']).toBe('https://schema.org');
  });

  it('sets correct positions and items', () => {
    const schema = generateBreadcrumbJsonLd(items);
    expect(schema.itemListElement).toHaveLength(3);
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[0].name).toBe('Home');
    expect(schema.itemListElement[2].position).toBe(3);
    expect(schema.itemListElement[2].item).toBe('https://example.com/blog/hello-world');
  });
});

describe('basePath handling', () => {
  it('uses a custom basePath in canonical and JSON-LD URLs', () => {
    const meta = generatePostMetadata(mockPost, { siteUrl, basePath: '/articles' });
    expect((meta as any).alternates?.canonical).toBe('https://example.com/articles/hello-world');

    const jsonLd = generateBlogJsonLd(mockPost, { siteUrl, basePath: '/articles' });
    expect(jsonLd.url).toBe('https://example.com/articles/hello-world');
  });

  it('normalizes messy basePath values', () => {
    const meta = generatePostMetadata(mockPost, { siteUrl, basePath: 'blog/' });
    expect((meta as any).alternates?.canonical).toBe('https://example.com/blog/hello-world');

    const jsonLd = generateBlogJsonLd(mockPost, { siteUrl, basePath: '/blog/' });
    expect(jsonLd.url).toBe('https://example.com/blog/hello-world');
  });
});
