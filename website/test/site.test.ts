// Source and build-output checks for the website audit fixes
// (QWEB-01 headers, QWEB-02 fonts, QWEB-03 URLs/sitemaps, QDOC-07 hero).
// The dist checks run only after `bun run build` has produced website/dist.
import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const client = join(root, 'dist/client');
const hasDist = existsSync(join(client, 'index.html'));

describe('source', () => {
  test('hero Next.js snippet matches the real API', () => {
    const hero = read('src/components/landing/Hero.astro');
    expect(hero).toContain('= ${k(\'await\')} params;');
    expect(hero).not.toContain('(params.slug)');
    expect(hero).toContain('siteUrl: blog.siteUrl');
    const rssLine = hero.split('\n').find((l) => l.includes("GET = ${f('createRssHandler')}"));
    expect(rssLine).toContain('description:');
    expect(hero).toMatch(/import'\)\} \{ \$\{f\('createRssHandler'\)\} \}/);
  });

  test('stylesheets do not @import Google Fonts', () => {
    for (const p of ['src/styles/landing.css', 'src/styles/starlight.css']) {
      expect(read(p)).not.toMatch(/@import[^;]*fonts\.googleapis/);
    }
  });

  test('_headers enforces safe headers and report-only CSP allowing Rybbit', () => {
    const h = read('public/_headers');
    for (const name of [
      'X-Content-Type-Options: nosniff',
      'Referrer-Policy:',
      'X-Frame-Options: DENY',
      'Permissions-Policy:',
      'Strict-Transport-Security:',
      "Content-Security-Policy: frame-ancestors 'none'",
    ]) expect(h).toContain(name);
    const ro = h.split('\n').find((l) => l.trim().startsWith('Content-Security-Policy-Report-Only:'))!;
    expect(ro).toMatch(/script-src [^;]*https:\/\/r\.bnap\.dev/);
    expect(ro).toMatch(/connect-src [^;]*https:\/\/r\.bnap\.dev/);
    expect(ro).toMatch(/font-src [^;]*https:\/\/fonts\.gstatic\.com/);
    expect(ro).toMatch(/style-src [^;]*https:\/\/fonts\.googleapis\.com/);
  });

  test('robots.txt points at the generated sitemap only', () => {
    expect(read('public/robots.txt')).toContain('Sitemap: https://yamblog.dev/sitemap-index.xml');
    expect(existsSync(join(root, 'src/pages/sitemap.xml.ts'))).toBe(false);
  });
});

describe.skipIf(!hasDist)('build output', () => {
  const html = (p: string) => readFileSync(join(client, p), 'utf8');
  const postSlugs = readdirSync(join(client, 'blog'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  test('internal post links use the canonical trailing-slash form', () => {
    expect(postSlugs.length).toBeGreaterThan(0);
    const index = html('blog/index.html');
    for (const slug of postSlugs) {
      expect(index).toContain(`href="/blog/${slug}/"`);
      expect(index).not.toContain(`href="/blog/${slug}"`);
      expect(html(`blog/${slug}/index.html`)).toContain(
        `<link rel="canonical" href="https://yamblog.dev/blog/${slug}/"`,
      );
    }
  });

  test('feed and llms.txt link to canonical post URLs', () => {
    const feed = html('feed.xml');
    const llms = html('llms.txt');
    for (const slug of postSlugs) {
      expect(feed).toContain(`<link>https://yamblog.dev/blog/${slug}/</link>`);
      expect(llms).not.toContain(`(https://yamblog.dev/blog/${slug})`);
    }
  });

  test('one sitemap, with the security headers and redirect shipped', () => {
    expect(existsSync(join(client, 'sitemap.xml'))).toBe(false);
    expect(existsSync(join(client, 'sitemap-index.xml'))).toBe(true);
    const headers = html('_headers');
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain('/_astro/*');
    expect(html('_redirects')).toContain('/sitemap.xml /sitemap-index.xml 301');
  });

  test('built CSS has no Google Fonts @import and pages link the fonts', () => {
    const astroDir = join(client, '_astro');
    for (const f of readdirSync(astroDir).filter((f) => f.endsWith('.css'))) {
      const css = readFileSync(join(astroDir, f), 'utf8');
      expect({ file: f, importsGoogleFonts: /@import\b/.test(css) && /googleapis/.test(css) }).toEqual({
        file: f,
        importsGoogleFonts: false,
      });
    }
    for (const p of ['index.html', 'getting-started/index.html']) {
      expect(html(p)).toContain('rel="preconnect" href="https://fonts.gstatic.com"');
      expect(html(p)).toContain('href="https://fonts.googleapis.com/css2?');
    }
  });
});
