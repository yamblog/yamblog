import { describe, it, expect } from 'bun:test';
import { remark } from 'remark';
import remarkDirective from 'remark-directive';
import { remarkInteractive, REFUSED_DIRECTIVE_NAMES } from '../src/interactive';
import type { RemarkInteractiveOptions } from '../src/interactive';
import { toHtml } from '../src/toHtml';

async function process(md: string, options?: RemarkInteractiveOptions) {
  const file = await remark()
    .use(remarkDirective)
    .use(remarkInteractive, options)
    .process(md);
  return String(file);
}

function html(md: string, options?: RemarkInteractiveOptions, sanitize = false) {
  return toHtml(md, { remarkPlugins: [remarkDirective, [remarkInteractive, options]], sanitize });
}

describe('remarkInteractive', () => {
  it('transforms a leaf directive into an explicitly closed HTML element', async () => {
    const out = await process('::counter-demo{start=0}');
    expect(out).toContain('<counter-demo start="0"></counter-demo>');
  });

  it('handles directives with multiple props', async () => {
    const out = await process('::chart{type=bar color=blue label=Sales}');
    expect(out).toContain('type="bar"');
    expect(out).toContain('color="blue"');
    expect(out).toContain('label="Sales"');
  });

  it('handles directives with no props', async () => {
    const out = await process('::my-widget');
    expect(out).toContain('<my-widget></my-widget>');
  });

  it('escapes double quotes in attribute values', async () => {
    // remark-directive decodes the entities, the plugin must re-escape them
    const out = await process('::alert{msg="say &quot;hello&quot;"}');
    expect(out.trim()).toBe('<alert msg="say &quot;hello&quot;"></alert>');
  });

  it('escapes ampersands in attribute values', async () => {
    const out = await process('::alert{msg="a &amp;quot; b"}');
    expect(out.trim()).toBe('<alert msg="a &amp;quot; b"></alert>');
  });

  it('leaves non-directive content unchanged', async () => {
    const out = await process('Just a normal paragraph.');
    expect(out).toContain('Just a normal paragraph.');
    expect(out).not.toContain('<');
  });

  it('does not swallow the content that follows (closing tag)', async () => {
    const out = await html('::counter-demo{start=0}\n\nafter');
    expect(out).toBe('<counter-demo start="0"></counter-demo>\n<p>after</p>');
  });

  it('keeps void elements self-closing', async () => {
    const out = await process('::hr');
    expect(out.trim()).toBe('<hr />');
  });

  it('preserves container directive children', async () => {
    const out = await html(':::note{.warn}\nImportant **content**\n:::');
    expect(out).toBe('<note class="warn">\n<p>Important <strong>content</strong></p>\n</note>');
  });

  it('preserves text and leaf directive labels', async () => {
    expect(await html('Say :smile[hello world] now')).toBe('<p>Say <smile>hello world</smile> now</p>');
    expect(await html('::badge[New]{tone=info}')).toBe('<p><badge tone="info">New</badge></p>');
  });

  describe('refused names', () => {
    it('exports the refused list', () => {
      expect([...REFUSED_DIRECTIVE_NAMES].sort()).toEqual(
        ['base', 'embed', 'iframe', 'link', 'meta', 'object', 'script', 'style'],
      );
    });

    for (const name of REFUSED_DIRECTIVE_NAMES) {
      it(`never emits a live <${name}> tag`, async () => {
        for (const output of ['html', 'element'] as const) {
          const out = await html(`::${name}{src=//evil.example/x.js}\n\nText :${name}[x] here`, { output });
          expect(out).not.toContain(`<${name}`);
          expect(out).toContain(`:${name}[x]`);
        }
      });
    }

    it('refuses names case-insensitively', async () => {
      const out = await html('::SCRIPT{src=x}');
      expect(out.toLowerCase()).not.toContain('<script');
    });
  });

  describe('default mode (no allow-list)', () => {
    it('restores mid-word prose such as a:b', async () => {
      const out = await html('Ratio is a:b and see note:this.');
      expect(out).toBe('<p>Ratio is a:b and see note:this.</p>');
    });

    it('restores javascript:alert(1) in prose', async () => {
      const out = await html('Never write javascript:alert(1) here.');
      expect(out).toBe('<p>Never write javascript:alert(1) here.</p>');
    });

    it('still converts standalone text directives and ones with labels or attributes', async () => {
      const out = await html('A :badge and x:pill[New] and y:tag{k=v}.');
      expect(out).toContain('<badge></badge>');
      expect(out).toContain('<pill>New</pill>');
      expect(out).toContain('<tag k="v"></tag>');
    });
  });

  describe('components allow-list', () => {
    it('converts only listed directives', async () => {
      const out = await html('::counter-demo{start=1}\n\n::other{a=1}', { components: ['counter-demo'] });
      expect(out).toContain('<counter-demo start="1"></counter-demo>');
      expect(out).not.toContain('<other');
    });

    it('restores prose that remark-directive parsed as text directives', async () => {
      const out = await html('Ratio is a:b and see note:this.', { components: ['counter-demo'] });
      expect(out).toBe('<p>Ratio is a:b and see note:this.</p>');
    });
  });

  describe("output: 'element'", () => {
    it('emits real elements with children and no raw HTML', async () => {
      const out = await html(':::note{.warn #n1}\nHi\n:::', { output: 'element' }, true);
      expect(out).toBe('<note class="warn" id="n1"><p>Hi</p></note>');
    });

    it('drops event-handler attributes', async () => {
      const out = await html('::img{src=x.png onerror="alert(1)"}', { output: 'element' });
      expect(out).toContain('<img src="x.png">');
      expect(out).not.toContain('onerror');
    });

    it('serializes back to directive markdown', async () => {
      const out = await process('::counter-demo{start=0}', { output: 'element' });
      expect(out.trim()).toBe('::counter-demo{start="0"}');
    });
  });
});
