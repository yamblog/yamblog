import { describe, it, expect } from 'bun:test';
import { remark } from 'remark';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { remarkEmbed } from '../src/embed';
import { toHtml } from '../src/toHtml';

async function process(md: string, options?: Parameters<typeof remarkEmbed>[0]) {
  const file = await remark().use(remarkEmbed, options).process(md);
  return String(file);
}

type HNode = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: HNode[] };

function collect(node: HNode, out: HNode[] = []): HNode[] {
  out.push(node);
  for (const c of node.children ?? []) collect(c, out);
  return out;
}

/**
 * Mirrors react-markdown 9: remark-rehype with allowDangerousHtml, after
 * which react-markdown renders any `raw` node as escaped text.
 */
async function reactMarkdownTree(md: string) {
  const processor = unified().use(remarkParse).use(remarkEmbed).use(remarkRehype, { allowDangerousHtml: true });
  const tree = (await processor.run(processor.parse(md))) as unknown as HNode;
  return collect(tree);
}

describe('remarkEmbed', () => {
  it('embeds a YouTube watch URL', async () => {
    const out = await process('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(out).toContain('youtube.com/embed/dQw4w9WgXcQ');
    expect(out).toContain('<iframe');
  });

  it('embeds a youtu.be short URL', async () => {
    const out = await process('https://youtu.be/dQw4w9WgXcQ');
    expect(out).toContain('youtube.com/embed/dQw4w9WgXcQ');
  });

  it('embeds YouTube URLs on other subdomains', async () => {
    expect(await process('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toContain('youtube.com/embed/dQw4w9WgXcQ');
    expect(await process('https://youtube.com/watch?v=dQw4w9WgXcQ')).toContain('youtube.com/embed/dQw4w9WgXcQ');
  });

  it('embeds a CodePen URL', async () => {
    const out = await process('https://codepen.io/johndoe/pen/abcXYZ');
    expect(out).toContain('codepen.io/johndoe/embed/abcXYZ');
  });

  it('embeds a Vimeo URL', async () => {
    const out = await process('https://vimeo.com/123456789');
    expect(out).toContain('player.vimeo.com/video/123456789');
  });

  it('does not embed URLs that are part of a sentence', async () => {
    const out = await process('Check out https://www.youtube.com/watch?v=dQw4w9WgXcQ here.');
    expect(out).not.toContain('<iframe');
  });

  it('does not embed unknown URLs', async () => {
    const out = await process('https://example.com/some/page');
    expect(out).not.toContain('<iframe');
  });

  it('does not embed a provider URL hidden in another host (RA-03)', async () => {
    expect(await process('https://evil.example/?u=vimeo.com/123')).not.toContain('<iframe');
    expect(await process('https://evil.example/youtu.be/dQw4w9WgXcQ')).not.toContain('<iframe');
  });

  it('does not let the CodePen user segment inject attributes (RA-03)', async () => {
    const md = 'https://codepen.io/x"onload="alert(1)/pen/abc';
    expect(await process(md)).not.toContain('<iframe');
    const html = await toHtml(md, { remarkPlugins: [remarkEmbed] });
    expect(html).not.toContain('<iframe');
    expect(html).not.toMatch(/<[^>]*\sonload=/);
  });

  it('leaves surrounding content intact', async () => {
    const md = `Before.\n\nhttps://youtu.be/dQw4w9WgXcQ\n\nAfter.`;
    const out = await process(md);
    expect(out).toContain('Before.');
    expect(out).toContain('<iframe');
    expect(out).toContain('After.');
  });

  it('accepts custom providers via options', async () => {
    const out = await process('https://example.com/embed/42', {
      providers: [
        {
          name: 'example',
          pattern: /example\.com\/embed\/(\d+)/,
          html: ([, id]) => `<div class="example" data-id="${id}"></div>`,
        },
      ],
    });
    expect(out).toContain('data-id="42"');
  });

  it('renders custom string providers through toHtml as before', async () => {
    const html = await toHtml('https://example.com/embed/42', {
      remarkPlugins: [[remarkEmbed, {
        providers: [{ name: 'example', pattern: /example\.com\/embed\/(\d+)/, html: ([, id]: RegExpMatchArray) => `<div data-id="${id}"></div>` }],
      }]],
    });
    expect(html).toBe('<div data-id="42"></div>');
  });

  it('renders a single iframe element through toHtml (RA-04)', async () => {
    const html = await toHtml('https://youtu.be/dQw4w9WgXcQ', { remarkPlugins: [remarkEmbed] });
    expect(html).toBe(
      '<iframe width="560" height="315" title="YouTube video" frameborder="0" ' +
        'src="https://www.youtube.com/embed/dQw4w9WgXcQ" allowfullscreen></iframe>',
    );
  });

  it('produces a real element, not raw HTML, for react-markdown (RA-04, QDOC-05)', async () => {
    const nodes = await reactMarkdownTree('hi\n\nhttps://youtu.be/dQw4w9WgXcQ\n\nhttps://vimeo.com/1\n\nhttps://codepen.io/a/pen/b');
    expect(nodes.filter((n) => n.type === 'raw')).toHaveLength(0);
    const iframes = nodes.filter((n) => n.type === 'element' && n.tagName === 'iframe');
    expect(iframes.map((n) => n.properties?.src)).toEqual([
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://player.vimeo.com/video/1',
      'https://codepen.io/a/embed/b',
    ]);
  });

  it('keeps built-in embeds when toHtml sanitizes', async () => {
    const html = await toHtml('https://vimeo.com/123', { remarkPlugins: [remarkEmbed], sanitize: true });
    expect(html).toContain('<iframe');
    expect(html).toContain('src="https://player.vimeo.com/video/123"');
  });
});
