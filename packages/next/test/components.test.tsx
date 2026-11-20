import { describe, it, expect } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlogListPage, BlogPostPage } from '../src/components/index';
import { serializeJsonLd, formatPostDate } from '../src/components/format';
import type { Post } from '@yamblog/core';

function post(slug: string, title: string, overrides: Partial<Post> = {}): Post {
  return {
    id: `blog-${slug}`,
    slug,
    title,
    date: new Date('2024-01-15'),
    excerpt: `About ${title}`,
    category: 'General',
    tags: ['intro'],
    author: 'Jane Doe',
    featured: false,
    draft: false,
    content: `# ${title}\n\nBody text.`,
    readingTime: 1,
    ...overrides,
  };
}

describe('BlogListPage', () => {
  it('renders post links with next/link', () => {
    const html = renderToStaticMarkup(<BlogListPage posts={[post('one', 'One'), post('two', 'Two')]} />);
    expect(html).toContain('href="/blog/one"');
    expect(html).toContain('href="/blog/two"');
    expect(html).toContain('January 15, 2024');
  });

  it('honours basePath and the query label', () => {
    const html = renderToStaticMarkup(<BlogListPage posts={[post('one', 'One')]} basePath="/notes" query="one" />);
    expect(html).toContain('href="/notes/one"');
    expect(html).toContain('1 result for');
  });
});

describe('BlogPostPage', () => {
  it('renders prev/next/related links', () => {
    const html = renderToStaticMarkup(
      <BlogPostPage
        post={post('two', 'Two')}
        prev={post('one', 'One')}
        next={post('three', 'Three')}
        related={[post('four', 'Four')]}
      />,
    );
    expect(html).toContain('href="/blog/one"');
    expect(html).toContain('href="/blog/three"');
    expect(html).toContain('href="/blog/four"');
    expect(html).toContain('<h1>Two</h1>');
  });

  it('accepts adjacent as documented in the README', () => {
    const html = renderToStaticMarkup(
      <BlogPostPage post={post('two', 'Two')} adjacent={{ prev: post('one', 'One'), next: null }} />,
    );
    expect(html).toContain('href="/blog/one"');
  });

  it('explicit prev/next take precedence over adjacent', () => {
    const html = renderToStaticMarkup(
      <BlogPostPage
        post={post('two', 'Two')}
        adjacent={{ prev: post('one', 'One'), next: post('three', 'Three') }}
        prev={null}
      />,
    );
    expect(html).not.toContain('href="/blog/one"');
    expect(html).toContain('href="/blog/three"');
  });

  it('renders jsonLd with < > & escaped so it cannot close the script', () => {
    const jsonLd = { headline: '</script><script>alert(1)</script> & more' };
    const html = renderToStaticMarkup(<BlogPostPage post={post('two', 'Two')} jsonLd={jsonLd} />);
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).not.toContain('</script><script>alert(1)');
    const body = html.split('<script type="application/ld+json">')[1].split('</script>')[0];
    expect(JSON.parse(body)).toEqual(jsonLd);
  });

  it('renders no script without jsonLd', () => {
    const html = renderToStaticMarkup(<BlogPostPage post={post('two', 'Two')} />);
    expect(html).not.toContain('<script');
  });

  it('forwards components to react-markdown', () => {
    const html = renderToStaticMarkup(
      <BlogPostPage
        post={post('two', 'Two', { content: 'hello **world**' })}
        components={{ strong: ({ children }) => <b className="x">{children}</b> }}
      />,
    );
    expect(html).toContain('<b class="x">world</b>');
  });
});

describe('formatPostDate', () => {
  it('formats in UTC regardless of the process timezone', () => {
    // 2024-01-15T00:00Z is Jan 14 in America/Los_Angeles; UTC must win.
    expect(formatPostDate(new Date('2024-01-15'))).toBe('January 15, 2024');
    expect(formatPostDate(new Date('2024-01-15T23:30:00Z'))).toBe('January 15, 2024');
  });
});

describe('serializeJsonLd', () => {
  it('escapes HTML-significant characters and line separators', () => {
    const out = serializeJsonLd({ a: '<>&  ' });
    expect(out).toBe('{"a":"\\u003c\\u003e\\u0026\\u2028\\u2029"}');
    expect(JSON.parse(out)).toEqual({ a: '<>&  ' });
  });
});
