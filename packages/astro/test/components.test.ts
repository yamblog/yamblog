import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { join } from 'path';
import { renderComponent } from './astro-render';

const postPage = join(import.meta.dir, '../src/components/BlogPostPage.astro');
const listPage = join(import.meta.dir, '../src/components/BlogListPage.astro');

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'blog-hello',
    slug: 'hello',
    title: 'Hello',
    date: new Date('2024-01-15'),
    readingTime: 1,
    author: 'Ann',
    tags: [],
    featured: false,
    draft: false,
    content: '# Hi\n\n<b>raw</b>',
    ...overrides,
  };
}

// Run west of UTC so local-time formatting would show the previous day.
const originalTz = process.env.TZ;
beforeAll(() => { process.env.TZ = 'America/Los_Angeles'; });
afterAll(() => { process.env.TZ = originalTz; });

function extractJsonLd(html: string): string {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  expect(match).not.toBeNull();
  return match![1]!;
}

describe('BlogPostPage.astro', () => {
  it('escapes </script> in JSON-LD so frontmatter cannot break out', async () => {
    const jsonLd = { headline: '</script><script>alert(1)</script>', note: 'a & b > c    ' };
    const html = await renderComponent(postPage, { post: makePost(), jsonLd });
    const body = extractJsonLd(html);
    expect(body).not.toContain('<');
    expect(body).not.toContain('>');
    expect(body).not.toContain('&');
    expect(html).not.toContain('<script>alert(1)');
    // Same JSON once parsed
    expect(JSON.parse(body)).toEqual(jsonLd);
  });

  it('omits the JSON-LD script when no jsonLd is given', async () => {
    const html = await renderComponent(postPage, { post: makePost() });
    expect(html).not.toContain('application/ld+json');
  });

  it('formats the date in UTC regardless of the process timezone', async () => {
    const html = await renderComponent(postPage, { post: makePost() });
    expect(html).toContain('January 15, 2024');
    expect(html).not.toContain('January 14, 2024');
  });

  it('keeps raw HTML in markdown by default (sanitize off)', async () => {
    const html = await renderComponent(postPage, { post: makePost() });
    expect(html).toContain('<b>raw</b>');
  });

  it('sanitize drops raw HTML and javascript: URLs from the post body', async () => {
    const content = 'hi <img src=x onerror=alert(1)>\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))';
    const html = await renderComponent(postPage, { post: makePost({ content }), sanitize: true });
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<script>alert(1)');
    expect(html).not.toContain('javascript:');
  });
});

describe('BlogListPage.astro', () => {
  it('formats dates in UTC regardless of the process timezone', async () => {
    const html = await renderComponent(listPage, { posts: [makePost()] });
    expect(html).toContain('January 15, 2024');
    expect(html).not.toContain('January 14, 2024');
  });
});
