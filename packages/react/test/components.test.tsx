import { describe, it, expect } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownRenderer, PostCard, PostList, PostLayout, useBlog } from '../src/index';
import { formatPostDate } from '../src/format';
import type { Post } from '@yamblog/core';

const post = (slug: string, title: string, overrides: Partial<Post> = {}): Post => ({
  id: `blog-${slug}`,
  slug,
  title,
  date: new Date('2024-01-15'),
  excerpt: `About ${title}`,
  tags: ['intro'],
  author: 'Jane',
  featured: false,
  draft: false,
  content: `# ${title}\n\nBody text.`,
  readingTime: 2,
  ...overrides,
});

describe('formatPostDate', () => {
  it('formats date-only frontmatter in UTC, never the previous day', () => {
    expect(formatPostDate(new Date('2024-01-15'))).toBe('January 15, 2024');
    expect(formatPostDate(new Date('2024-01-15T23:59:00Z'))).toBe('January 15, 2024');
  });
});

describe('PostCard / PostList', () => {
  it('renders title link, UTC date and tags', () => {
    const html = renderToStaticMarkup(<PostCard post={post('one', 'One')} basePath="/notes" />);
    expect(html).toContain('href="/notes/one"');
    expect(html).toContain('January 15, 2024');
    expect(html).toContain('<span>intro</span>');
  });

  it('renders the empty state', () => {
    expect(renderToStaticMarkup(<PostList posts={[]} />)).toBe('<p>No posts found.</p>');
    expect(renderToStaticMarkup(<PostList posts={[]} emptyState={<i>none</i>} />)).toBe('<i>none</i>');
  });

  it('renders one card per post', () => {
    const html = renderToStaticMarkup(<PostList posts={[post('one', 'One'), post('two', 'Two')]} />);
    expect(html.match(/<li>/g)).toHaveLength(2);
  });
});

describe('PostLayout', () => {
  it('renders adjacent navigation and children', () => {
    const html = renderToStaticMarkup(
      <PostLayout post={post('two', 'Two')} adjacent={{ prev: post('one', 'One'), next: null }}>
        <p>child</p>
      </PostLayout>,
    );
    expect(html).toContain('href="/blog/one"');
    expect(html).toContain('<article><p>child</p></article>');
    expect(html).toContain('January 15, 2024');
  });
});

describe('MarkdownRenderer', () => {
  it('renders markdown with custom components and className', () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        className="prose"
        content={'# Title\n\nhello **world**'}
        components={{ strong: ({ children }) => <b>{children}</b> }}
      />,
    );
    expect(html).toBe('<div class="prose"><h1>Title</h1>\n<p>hello <b>world</b></p></div>');
  });

  it('does not render raw HTML from markdown', () => {
    const html = renderToStaticMarkup(<MarkdownRenderer content={'<script>alert(1)</script>'} />);
    expect(html).not.toContain('<script>');
  });
});

describe('useBlog', () => {
  function Probe({ items }: { items: Post[] }) {
    const { posts, query } = useBlog(items);
    return <span>{`${query}|${posts.length}`}</span>;
  }

  it('returns all posts with an empty query', () => {
    const html = renderToStaticMarkup(<Probe items={[post('one', 'One'), post('two', 'Two')]} />);
    expect(html).toBe('<span>|2</span>');
  });
});
