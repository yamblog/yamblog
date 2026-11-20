import { describe, it, expect } from 'bun:test';
import { remark } from 'remark';
import { remarkToc } from '../src/toc';
import { toHtml } from '../src/toHtml';

async function process(md: string, options?: Parameters<typeof remarkToc>[0]) {
  const file = await remark().use(remarkToc, options).process(md);
  return String(file);
}

const SAMPLE = `
# My Post

## Table of Contents

## Introduction

Some intro text.

## Usage

### Basic Usage

Advanced section.

## Conclusion
`.trim();

describe('remarkToc', () => {
  it('replaces the TOC heading with a list', async () => {
    const out = await process(SAMPLE);
    expect(out).toContain('*');
    expect(out).not.toContain('## Table of Contents');
  });

  it('links point to heading anchors', async () => {
    const out = await process(SAMPLE);
    expect(out).toContain('#introduction');
    expect(out).toContain('#usage');
    expect(out).toContain('#conclusion');
  });

  it('includes h3 headings by default', async () => {
    const out = await process(SAMPLE);
    expect(out).toContain('#basic-usage');
  });

  it('respects maxDepth option', async () => {
    const out = await process(SAMPLE, { maxDepth: 2 });
    expect(out).not.toContain('#basic-usage');
    expect(out).toContain('#introduction');
  });

  it('respects custom heading option', async () => {
    const md = `# Post\n\n## Contents\n\n## Hello\n\n## World`;
    const out = await process(md, { heading: 'Contents' });
    expect(out).not.toContain('## Contents');
    expect(out).toContain('#hello');
  });

  it('does nothing when no matching placeholder heading found', async () => {
    const md = `# Post\n\n## Hello\n\n## World`;
    const out = await process(md);
    expect(out).toContain('## Hello');
    expect(out).toContain('## World');
  });

  it('does nothing when there are no headings to list', async () => {
    const md = `# Post\n\n## Table of Contents\n\nJust a paragraph.`;
    const out = await process(md);
    // No headings to list → placeholder is left untouched
    expect(out).toContain('Table of Contents');
  });

  it('slugifies heading text correctly', async () => {
    const md = `# Post\n\n## Table of Contents\n\n## Hello World!\n\n## TypeScript & React`;
    const out = await process(md);
    expect(out).toContain('#hello-world');
    expect(out).toContain('#typescript-react');
  });

  it('treats regex metacharacters in the heading option as literal text', async () => {
    // 'C++ Guide' is an invalid regex pattern — must not throw
    const md = `# Post\n\n## C++ Guide\n\n## Hello\n\n## World`;
    const out = await process(md, { heading: 'C++ Guide' });
    expect(out).not.toContain('## C++ Guide');
    expect(out).toContain('#hello');

    // Parentheses must match literally, not as a capture group
    const md2 = `# Post\n\n## Contents (overview)\n\n## Hello\n\n## World`;
    const out2 = await process(md2, { heading: 'Contents (overview)' });
    expect(out2).not.toContain('## Contents (overview)');
    expect(out2).toContain('#hello');
  });

  it('replaces a nested placeholder in its own parent (RA-07)', async () => {
    const md = `# T\n\npara\n\n> ## Table of Contents\n\n## One`;
    const out = await process(md);
    expect(out).toContain('# T');
    expect(out).not.toContain('Table of Contents');
    expect(out).toContain('> * [One](#one)');
  });

  it('replaces the first placeholder, not the last (RA-07)', async () => {
    const md = `# T\n\n## Table of Contents\n\n## One\n\n## Table of Contents\n\n## Two`;
    const out = await process(md);
    const toc = out.indexOf('[One](#one)');
    const leftover = out.indexOf('## Table of Contents');
    expect(toc).toBeGreaterThan(-1);
    expect(leftover).toBeGreaterThan(toc);
    expect(out.match(/## Table of Contents/g)).toHaveLength(1);
  });

  it('does not add heading ids by default (legacy behaviour)', async () => {
    const html = await toHtml(`## Table of Contents\n\n## Hello World`, { remarkPlugins: [remarkToc] });
    expect(html).toContain('<a href="#hello-world">');
    expect(html).toContain('<h2>Hello World</h2>');
  });

  describe('ids option (RA-06, QDOC-06)', () => {
    async function idsHtml(md: string) {
      return toHtml(md, { remarkPlugins: [[remarkToc, { ids: true }]] });
    }

    function assertLinksResolve(html: string) {
      const hrefs = [...html.matchAll(/href="#([^"]*)"/g)].map((m) => decodeURIComponent(m[1]));
      const ids = new Set([...html.matchAll(/ id="([^"]*)"/g)].map((m) => m[1]));
      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) expect(ids.has(href)).toBe(true);
    }

    it('gives every TOC target heading a matching id through toHtml', async () => {
      const html = await idsHtml(SAMPLE);
      expect(html).toContain('<h2 id="introduction">Introduction</h2>');
      expect(html).toContain('<h3 id="basic-usage">Basic Usage</h3>');
      assertLinksResolve(html);
    });

    it('uses github-slugger slugs: unicode, symbols and duplicates', async () => {
      const html = await idsHtml(`## Table of Contents\n\n## A & B\n\n## 日本語\n\n## Dup\n\n## Dup`);
      expect(html).toContain('href="#a--b"');
      expect(html).toContain('id="日本語"');
      expect(html).toContain('href="#dup"');
      expect(html).toContain('href="#dup-1"');
      assertLinksResolve(html);
    });

    it('keeps an id that is already set on a heading', async () => {
      const preset = () => (tree: { children: { type: string; data?: unknown }[] }) => {
        const h = tree.children.find((n) => n.type === 'heading' && (n as { depth?: number }).depth === 2 && !JSON.stringify(n).includes('Table'));
        if (h) h.data = { hProperties: { id: 'custom' } };
      };
      const html = await toHtml(`## Table of Contents\n\n## Hello`, { remarkPlugins: [preset, [remarkToc, { ids: true }]] });
      expect(html).toContain('href="#custom"');
      expect(html).toContain('<h2 id="custom">Hello</h2>');
    });
  });
});
