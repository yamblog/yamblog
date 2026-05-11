import { describe, it, expect } from 'bun:test';
import { remark } from 'remark';
import remarkDirective from 'remark-directive';
import { remarkInteractive } from '../src/interactive';

async function process(md: string) {
  const file = await remark()
    .use(remarkDirective)
    .use(remarkInteractive)
    .process(md);
  return String(file);
}

describe('remarkInteractive', () => {
  it('transforms a leaf directive into a self-closing HTML element', async () => {
    const out = await process('::counter-demo{start=0}');
    expect(out).toContain('<counter-demo start="0" />');
  });

  it('handles directives with multiple props', async () => {
    const out = await process('::chart{type=bar color=blue label=Sales}');
    expect(out).toContain('type="bar"');
    expect(out).toContain('color="blue"');
    expect(out).toContain('label="Sales"');
  });

  it('handles directives with no props', async () => {
    const out = await process('::my-widget');
    expect(out).toContain('<my-widget />');
  });

  it('escapes double quotes in attribute values', async () => {
    // remark-directive uses HTML attribute syntax: quotes must wrap the whole value
    const out = await process('::alert{msg="say &quot;hello&quot;"}');
    expect(out).toContain('<alert');
  });

  it('leaves non-directive content unchanged', async () => {
    const out = await process('Just a normal paragraph.');
    expect(out).toContain('Just a normal paragraph.');
    expect(out).not.toContain('<');
  });
});
