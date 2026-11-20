import { describe, expect, test } from 'bun:test';
import {
  canonicalizeFeedLinks,
  canonicalizeLlmsLinks,
  postPath,
  postUrl,
} from '../src/lib/urls';

const SITE = 'https://yamblog.dev';

describe('post URL helpers', () => {
  test('use the trailing-slash form that matches the canonical link', () => {
    expect(postPath('hello')).toBe('/blog/hello/');
    expect(postUrl(SITE, 'hello')).toBe('https://yamblog.dev/blog/hello/');
    expect(postUrl(`${SITE}/`, 'hello')).toBe('https://yamblog.dev/blog/hello/');
  });

  test('feed <link>s get the trailing slash but <guid>s stay stable', () => {
    const xml = [
      '<channel><link>https://yamblog.dev/blog</link>',
      '<item><link>https://yamblog.dev/blog/hello</link><guid>https://yamblog.dev/blog/hello</guid></item>',
      '<item><link>https://yamblog.dev/blog/hello-world</link><guid>https://yamblog.dev/blog/hello-world</guid></item>',
    ].join('');
    const out = canonicalizeFeedLinks(xml, SITE, ['hello', 'hello-world']);
    expect(out).toContain('<channel><link>https://yamblog.dev/blog/</link>');
    expect(out).toContain('<link>https://yamblog.dev/blog/hello/</link>');
    expect(out).toContain('<link>https://yamblog.dev/blog/hello-world/</link>');
    // guids unchanged, so feed readers do not redeliver old posts
    expect(out).toContain('<guid>https://yamblog.dev/blog/hello</guid>');
    expect(out).toContain('<guid>https://yamblog.dev/blog/hello-world</guid>');
    // a slug that is a prefix of another is not rewritten twice
    expect(out).not.toContain('hello/-world');
  });

  test('llms.txt links get the trailing slash', () => {
    const text = '- [Hello](https://yamblog.dev/blog/hello): intro\n- [Other](https://example.com/blog/hello)';
    const out = canonicalizeLlmsLinks(text, SITE, ['hello']);
    expect(out).toContain('- [Hello](https://yamblog.dev/blog/hello/): intro');
    expect(out).toContain('(https://example.com/blog/hello)');
  });
});
