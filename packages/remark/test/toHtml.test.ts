import { describe, it, expect } from 'bun:test';
import { toHtml } from '../src/toHtml';
import { isSafeUrl } from '../src/sanitize';
import { remarkToc } from '../src/toc';

const HOSTILE = [
  'hi <img src=x onerror=alert(1)>',
  '',
  '<script>alert(1)</script>',
  '',
  '<iframe src="https://evil.example"></iframe>',
  '',
  '[x](javascript:alert(1)) [y](<JaVaScRiPt:alert(1)>) [d](data:text/html,hi) [v](vbscript:x)',
  '',
  '![i](javascript:alert(1))',
].join('\n');

describe('toHtml', () => {
  it('converts markdown to HTML', async () => {
    expect(await toHtml('# Hi\n\n*a* [b](/c)')).toBe('<h1>Hi</h1>\n<p><em>a</em> <a href="/c">b</a></p>');
  });

  it('applies remark plugins', async () => {
    const html = await toHtml('## Table of Contents\n\n## One', { remarkPlugins: [remarkToc] });
    expect(html).toContain('<a href="#one">One</a>');
  });

  it('applies rehype plugins', async () => {
    const addClass = () => (tree: { children: { type: string; properties?: Record<string, unknown> }[] }) => {
      for (const n of tree.children) if (n.type === 'element') n.properties = { ...n.properties, className: ['x'] };
    };
    expect(await toHtml('p', { rehypePlugins: [addClass] })).toBe('<p class="x">p</p>');
  });

  it('passes raw HTML through by default (trusted-content mode, unchanged)', async () => {
    const html = await toHtml(HOSTILE);
    expect(html).toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('<script>alert(1)</script>');
    expect(html).toContain('href="javascript:alert(1)"');
  });

  describe('sanitize: true (RA-01, QDOC-02)', () => {
    it('drops raw HTML, script and event handlers', async () => {
      const html = await toHtml(HOSTILE, { sanitize: true });
      expect(html).not.toContain('<script');
      expect(html).not.toContain('<img src=x');
      expect(html).not.toContain('onerror');
      expect(html).not.toContain('<iframe');
      expect(html).not.toContain('evil.example');
    });

    it('removes dangerous URL schemes but keeps the link text', async () => {
      const html = await toHtml(HOSTILE, { sanitize: true });
      expect(html.toLowerCase()).not.toContain('javascript:');
      expect(html).not.toContain('data:text/html');
      expect(html).not.toContain('vbscript:');
      expect(html).toContain('<a>x</a>');
      expect(html).toContain('<img alt="i">');
    });

    it('keeps ordinary markdown and safe links', async () => {
      const md = '# T\n\n[a](https://a.example) [b](/rel:x) [c](#frag) [m](mailto:a@b.c) ![i](img.png "t")\n\n`<b>`';
      expect(await toHtml(md, { sanitize: true })).toBe(
        '<h1>T</h1>\n<p><a href="https://a.example">a</a> <a href="/rel:x">b</a> <a href="#frag">c</a> ' +
          '<a href="mailto:a@b.c">m</a> <img src="img.png" alt="i" title="t"></p>\n<p><code>&#x3C;b></code></p>',
      );
    });

    it('sanitizes what rehype plugins add', async () => {
      const inject = () => (tree: { children: unknown[] }) => {
        tree.children.push(
          { type: 'element', tagName: 'script', properties: {}, children: [{ type: 'text', value: 'x' }] },
          { type: 'raw', value: '<b onclick=x>' },
          { type: 'element', tagName: 'a', properties: { href: ' java\tscript:x', onClick: 'x', style: 'position:fixed' }, children: [] },
        );
      };
      const html = await toHtml('p', { rehypePlugins: [inject], sanitize: true });
      expect(html).toBe('<p>p</p><a></a>');
    });

    it('drops plugin-created elements with hName script/iframe', async () => {
      const inject = () => (tree: { children: unknown[] }) => {
        tree.children.push(
          { type: 'paragraph', data: { hName: 'script', hProperties: { src: '//x' } }, children: [] },
          { type: 'paragraph', data: { hName: 'iframe', hProperties: { src: 'https://evil.example' } }, children: [] },
        );
      };
      expect(await toHtml('p', { remarkPlugins: [inject], sanitize: true })).toBe('<p>p</p>\n\n');
    });
  });
});

describe('isSafeUrl', () => {
  it.each([
    ['https://a.example', true],
    ['http://a.example', true],
    ['/path:with-colon', true],
    ['#frag', true],
    ['?q=a:b', true],
    ['relative/a:b', true],
    ['mailto:x@y.z', true],
    ['tel:+1', true],
    ['javascript:alert(1)', false],
    [' JAVASCRIPT:alert(1)', false],
    ['java\nscript:alert(1)', false],
    ['data:text/html,x', false],
    ['vbscript:x', false],
  ])('%p -> %p', (url, safe) => {
    expect(isSafeUrl(url)).toBe(safe);
  });
});
