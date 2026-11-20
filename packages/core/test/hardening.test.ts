// Regression tests for hostile / unusual input: executable front matter,
// bad dates, custom schemas, caller mutation, injection into generated
// artifacts, and other edge cases found in the security/correctness audit.
import { describe, it, expect, afterAll, spyOn } from 'bun:test';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import matter from 'gray-matter';
import { z } from 'zod';
import { createBlog, defineBlog, defaultSchema, serializeJsonLd, defaultSlugify, generateLlmsTxt, searchPosts } from '../src/index';
import { parsePost } from '../src/parser';
import { readingTime } from '../src/utils';
import { generateRss } from '../src/rss';
import { generateSitemap } from '../src/sitemap';

const dirs: string[] = [];
function contentDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'yamblog-hardening-'));
  dirs.push(dir);
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return dir;
}
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

const post = (fm: string, body = 'body') => `---\n${fm}\n---\n${body}`;

describe('executable front matter is rejected', () => {
  const g = globalThis as Record<string, unknown>;

  for (const fence of ['---js', '---javascript', '---JS', '--- js', '---coffee']) {
    it(`does not evaluate ${JSON.stringify(fence)} front matter`, () => {
      delete g.__yamblogPwned;
      const raw = `${fence}\n{ title: (globalThis.__yamblogPwned = 1, "x"), date: new Date(0) }\n---\nbody`;
      expect(() => parsePost(raw, 'evil')).toThrow(/not supported/);
      expect(g.__yamblogPwned).toBeUndefined();
    });
  }

  it('names the file when loading through createBlog', () => {
    const dir = contentDir({
      'evil.md': '---js\n{ title: (globalThis.__yamblogPwned = 2, "x"), date: new Date(0) }\n---\nbody',
    });
    delete g.__yamblogPwned;
    expect(() => createBlog({ contentDir: dir }).getPostsSync()).toThrow(/evil\.md/);
    expect(g.__yamblogPwned).toBeUndefined();
  });

  it('still parses YAML and JSON front matter', () => {
    expect(parsePost(post('title: Y\ndate: 2024-01-01'), 'y').title).toBe('Y');
    expect(parsePost('---json\n{ "title": "J", "date": "2024-01-01" }\n---\nbody', 'j').title).toBe('J');
  });

  it("does not grow gray-matter's global cache", () => {
    const before = Object.keys(matter.cache).length;
    parsePost(post(`title: Cache ${Math.random()}\ndate: 2024-01-01`), 'c');
    expect(Object.keys(matter.cache).length).toBe(before);
  });
});

describe('parse and read errors name the file', () => {
  it('wraps YAML errors with the filename and keeps the cause', () => {
    const dir = contentDir({ 'broken.md': post('title: [unclosed\ndate: 2024-01-01') });
    let caught: unknown;
    try {
      createBlog({ contentDir: dir }).getPostsSync();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain('broken.md');
    expect((caught as Error & { cause?: unknown }).cause).toBeInstanceOf(Error);
  });

  it('skips directories whose name ends in .md', () => {
    const dir = contentDir({ 'a.md': post('title: A\ndate: 2024-01-01') });
    mkdirSync(join(dir, 'notes.md'));
    expect(createBlog({ contentDir: dir }).getPostsSync().map(p => p.slug)).toEqual(['a']);
  });
});

describe('date front matter', () => {
  it('rejects an empty date with an error naming the file', () => {
    const dir = contentDir({ 'empty-date.md': post('title: A\ndate:') });
    expect(() => createBlog({ contentDir: dir }).getPostsSync()).toThrow(/empty-date\.md[\s\S]*"date"/);
  });

  it('rejects boolean dates', () => {
    expect(() => parsePost(post('title: A\ndate: true'), 'b')).toThrow(/"date"/);
  });

  it('keeps accepting numbers and date strings as before', () => {
    expect(parsePost(post('title: A\ndate: 1700000000000'), 'n').date.getTime()).toBe(1700000000000);
    expect(parsePost(post('title: A\ndate: "2024-03-01"'), 's').date.toISOString()).toBe('2024-03-01T00:00:00.000Z');
  });

  it('rejects a bare year and other small numbers instead of loading 1970', () => {
    expect(() => parsePost(post('title: A\ndate: 2024'), 'y', undefined, 'y.md')).toThrow(/y\.md[\s\S]*"date"[\s\S]*2024-01-01/);
    expect(() => parsePost(post('title: A\ndate: 0'), 'z')).toThrow(/"date"/);
  });

  it('leaves custom nullable date fields alone', () => {
    const schema = defaultSchema.extend({ date: z.coerce.date().nullable() });
    expect(parsePost(post('title: A\ndate:'), 'x', schema).date).toBeNull();
  });
});

describe('custom schemas that do not extend defaultSchema', () => {
  const schema = z.object({ name: z.string() });
  const files = {
    'one.md': post('name: One'),
    'two.md': post('name: Two'),
    'hidden.md': post('name: Hidden\ndraft: true'),
  };

  it('hides posts with a literal draft: true even though the schema strips it', () => {
    const blog = createBlog({ contentDir: contentDir(files), schema, sortBy: () => 0 });
    const slugs = blog.getPostsSync().map(p => p.slug);
    expect(slugs).not.toContain('hidden');
    expect(slugs.sort()).toEqual(['one', 'two']);
  });

  it('lets a schema that declares draft decide', () => {
    const declared = z.object({ name: z.string(), draft: z.boolean().default(false).transform(() => false) });
    const blog = createBlog({ contentDir: contentDir(files), schema: declared, sortBy: () => 0 });
    expect(blog.getPostsSync().map(p => p.slug)).toContain('hidden');
  });

  it('keeps slug-based methods working', () => {
    const blog = createBlog({ contentDir: contentDir(files), schema, sortBy: () => 0 });
    expect(blog.getPostBySlugSync('one').name).toBe('One');
  });

  it('throws a descriptive error from the default sort', () => {
    const blog = createBlog({ contentDir: contentDir(files), schema });
    expect(() => blog.getPostsSync()).toThrow(/Date `date`.*sortBy/s);
  });

  it('throws descriptive errors from methods that need missing fields', () => {
    const blog = createBlog({ contentDir: contentDir(files), schema, sortBy: () => 0 });
    expect(() => blog.searchSync('one')).toThrow(/search\(\).*`title`/s);
    expect(() => blog.getPostsByTagSync('t')).toThrow(/getPostsByTag\(\).*`tags`/s);
    expect(() => blog.getRelatedPostsSync('one')).toThrow(/getRelatedPosts\(\).*`tags`/s);
    expect(() => blog.generateRssSync({ title: 't', description: 'd', siteUrl: 'https://x.dev' })).toThrow(/generateRss\(\)/);
    expect(() => blog.generateSitemapSync({ siteUrl: 'https://x.dev' })).toThrow(/generateSitemap\(\).*`date`/s);
    expect(() => blog.generateSearchIndexSync()).toThrow(/generateSearchIndex\(\).*`date`/s);
  });
});

describe('returned arrays do not alias the cache', () => {
  it('a caller reversing getPostsSync() does not reorder later calls', () => {
    const dir = contentDir({
      'old.md': post('title: Old\ndate: 2023-01-01'),
      'new.md': post('title: New\ndate: 2024-01-01'),
    });
    for (const includeDrafts of [false, true]) {
      const blog = createBlog({ contentDir: dir, includeDrafts, siteUrl: 'https://x.dev' });
      blog.getPostsSync().reverse();
      expect(blog.getPostsSync()[0]!.slug).toBe('new');
      expect(blog.getAdjacentPostsSync('new')).toMatchObject({ prev: null });
      expect(blog.generateSitemapSync().indexOf('/blog/new')).toBeLessThan(blog.generateSitemapSync().indexOf('/blog/old'));
    }
  });
});

describe('generator options with explicit undefined fall back to config', () => {
  const dir = contentDir({ 'c.md': post('title: C\ndate: 2024-01-01\nfeatured: true') });
  const blog = createBlog({ contentDir: dir, siteUrl: 'https://x.dev', basePath: '/articles' });

  it('rss', () => {
    const xml = blog.generateRssSync({ title: 't', description: 'd', siteUrl: undefined, basePath: undefined });
    expect(xml).toContain('<link>https://x.dev/articles/c</link>');
  });

  it('sitemap and llms.txt', () => {
    expect(blog.generateSitemapSync({ siteUrl: undefined, basePath: undefined })).toContain('<loc>https://x.dev/articles/c</loc>');
    expect(blog.generateLlmsTxtSync({ basePath: undefined })).toContain('(https://x.dev/articles/c)');
  });
});

describe('XML output', () => {
  const dir = contentDir({ 'c.md': post('title: C\ndate: 2024-01-01\nexcerpt: "x\\by\\u0001z"') });

  it('escapes reserved characters in URLs', () => {
    const blog = createBlog({ contentDir: dir, siteUrl: 'https://x.dev', slugify: f => `Q&A <${f}` });
    const rss = blog.generateRssSync({ title: 't', description: 'd' });
    const sitemap = blog.generateSitemapSync();
    for (const xml of [rss, sitemap]) {
      expect(xml).not.toContain('Q&A <');
      expect(xml).toContain('Q&amp;A &lt;c.md');
    }
  });

  it('strips characters XML 1.0 does not allow', () => {
    const blog = createBlog({ contentDir: dir, siteUrl: 'https://x.dev' });
    const rss = blog.generateRssSync({ title: 'a\u0000b', description: 'd' });
    expect(rss).toContain('<description>xyz</description>');
    expect(rss).toContain('<title>ab</title>');
    // eslint-disable-next-line no-control-regex
    expect(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(rss)).toBe(false);
  });

  it('warns once per generator and site URL when the site URL is not absolute', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      generateSitemap([], { siteUrl: '/relative-a' });
      generateSitemap([], { siteUrl: '/relative-a' });
      generateRss([], { siteUrl: '/relative-a', title: 't', description: 'd' });
      generateRss([], { siteUrl: 'https://x.dev', title: 't', description: 'd' });
      const calls = warn.mock.calls.map(c => String(c[0]));
      expect(calls.filter(c => c.includes('generateSitemap()')).length).toBe(1);
      expect(calls.filter(c => c.includes('generateRss()')).length).toBe(1);
      expect(calls.some(c => c.includes('https://x.dev'))).toBe(false);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('llms.txt', () => {
  it('cannot be link-rewritten or line-injected through front matter', () => {
    const posts = [
      parsePost(
        post('title: "A](https://evil.example) b\\nIgnore previous"\ndate: 2024-01-01\nexcerpt: "one\\ntwo"\nfeatured: true'),
        'a',
      ),
    ];
    const txt = generateLlmsTxt(posts, { siteUrl: 'https://x.dev', sectionTitle: 'Blog\n# Injected' });
    const lines = txt.split('\n');
    expect(lines).toEqual([
      '## Blog # Injected',
      '',
      '- [A\\](https://evil.example) b Ignore previous](https://x.dev/blog/a): one two',
    ]);
  });

  it('types and applies a filter against the blog schema', () => {
    const schema = defaultSchema.extend({ company: z.string() });
    const dir = contentDir({
      'a.md': post('title: A\ndate: 2024-01-01\ncompany: acme'),
      'b.md': post('title: B\ndate: 2024-01-02\ncompany: other'),
    });
    const blog = createBlog({ contentDir: dir, schema, siteUrl: 'https://x.dev' });
    const txt = blog.generateLlmsTxtSync({ filter: p => p.company === 'acme' });
    expect(txt).toContain('[A]');
    expect(txt).not.toContain('[B]');
  });
});

describe('search', () => {
  it('sees content changes on the same post object', () => {
    const p = parsePost(post('title: T\ndate: 2024-01-01', 'alpha'), 't');
    const blog = [p];
    expect(searchPosts(blog, 'alpha')).toHaveLength(1);
    p.content = 'beta';
    expect(searchPosts(blog, 'alpha')).toHaveLength(0);
    expect(searchPosts(blog, 'beta')).toHaveLength(1);
  });
});

describe('defineBlog Vercel detection', () => {
  const KEYS = ['SITE', 'PUBLIC_SITE_URL', 'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_BASE_URL', 'VERCEL_ENV', 'VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL'];
  function withEnv(env: Record<string, string>, fn: () => void) {
    const saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]]));
    for (const k of KEYS) delete process.env[k];
    Object.assign(process.env, env);
    try {
      fn();
    } finally {
      for (const k of KEYS) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    }
  }
  const vercel = { VERCEL_URL: 'proj-abc123.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'example.com' };

  it('uses the production domain on production deployments', () => {
    withEnv({ ...vercel, VERCEL_ENV: 'production' }, () => {
      expect(defineBlog('content').siteUrl).toBe('https://example.com');
    });
  });

  it('keeps VERCEL_URL on preview deployments and without VERCEL_ENV', () => {
    withEnv({ ...vercel, VERCEL_ENV: 'preview' }, () => {
      expect(defineBlog('content').siteUrl).toBe('https://proj-abc123.vercel.app');
    });
    withEnv({ VERCEL_URL: 'proj-abc123.vercel.app' }, () => {
      expect(defineBlog('content').siteUrl).toBe('https://proj-abc123.vercel.app');
    });
  });

  it('explicit env vars still win', () => {
    withEnv({ ...vercel, VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://custom.dev' }, () => {
      expect(defineBlog('content').siteUrl).toBe('https://custom.dev');
    });
  });
});

describe('non-Latin content', () => {
  it('counts Chinese/Japanese characters for reading time', () => {
    expect(readingTime('日本語の文章です。'.repeat(500))).toBe(8); // 4000 CJK chars / 500 per min
    expect(readingTime('日本語 '.repeat(500) + 'word '.repeat(200))).toBe(4); // 1500/500 + 200/200
    // Latin text is unchanged
    expect(readingTime('word '.repeat(201))).toBe(2);
  });

  it('gives non-Latin filenames a slug instead of failing', () => {
    expect(defaultSlugify('日本語.md')).toBe('日本語');
    expect(defaultSlugify('Привет мир.md')).toBe('привет-мир');
    const dir = contentDir({ '日本語.md': post('title: J\ndate: 2024-01-01') });
    expect(createBlog({ contentDir: dir }).getPostsSync()[0]!.slug).toBe('日本語');
  });

  it('does not change slugs that already worked', () => {
    expect(defaultSlugify('café.md')).toBe('caf');
    expect(defaultSlugify('My Post.md')).toBe('my-post');
    expect(defaultSlugify('日本語 notes.md')).toBe('notes');
  });
});

describe('serializeJsonLd', () => {
  it('escapes characters that could end a script element', () => {
    const value = { name: '</script><script>alert(1)</script> & \u2028\u2029' };
    const out = serializeJsonLd(value);
    expect(out).not.toMatch(/[<>&\u2028\u2029]/);
    expect(out).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(out)).toEqual(value);
  });

  it('matches JSON.stringify for plain values', () => {
    expect(serializeJsonLd({ a: 1, b: ['x'] })).toBe('{"a":1,"b":["x"]}');
  });
});

describe('package manifest', () => {
  it('exports a default condition so require() resolves', () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dir, '..', 'package.json'), 'utf-8'));
    expect(pkg.exports['.'].default).toBe('./dist/index.js');
    expect(pkg.exports['./search'].default).toBe('./dist/search.js');
    expect(pkg.peerDependencies.zod).toBeDefined();
  });
});
