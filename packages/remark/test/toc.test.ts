import { describe, it, expect } from 'bun:test';
import { remark } from 'remark';
import { remarkToc } from '../src/toc';

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
});
