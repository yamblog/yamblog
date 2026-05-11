import { describe, it, expect } from 'bun:test';
import { remark } from 'remark';
import { remarkEmbed } from '../src/embed';

async function process(md: string, options?: Parameters<typeof remarkEmbed>[0]) {
  const file = await remark().use(remarkEmbed, options).process(md);
  return String(file);
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
});
