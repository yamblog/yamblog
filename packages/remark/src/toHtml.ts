import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import type { PluggableList } from 'unified';
import { rehypeSanitizeLite } from './sanitize.js';

export type ToHtmlOptions = {
  /** Remark plugins inserted before remark-rehype */
  remarkPlugins?: PluggableList;
  /** Rehype plugins inserted before rehype-stringify */
  rehypePlugins?: PluggableList;
  /**
   * Sanitize the output for content you do not fully trust (CMS input, user
   * submissions, AI-written posts).
   *
   * - `false` (default): raw HTML in the markdown is passed through verbatim,
   *   and link/image URLs are not filtered (`javascript:` links survive). Only
   *   use this for content written by trusted authors.
   * - `true`: raw HTML is not passed through, and after your `rehypePlugins`
   *   have run, script-capable elements (`script`, `style`, `object`, `embed`,
   *   `form`, `svg`, `iframe`, …), `on*` / `style` / `srcdoc` attributes and
   *   URLs with a scheme other than http(s), mailto or tel are removed. The
   *   built-in `remarkEmbed` players (YouTube, Vimeo, CodePen iframes) are kept.
   *
   * Default: `false`.
   */
  sanitize?: boolean;
};

/**
 * Converts a markdown string to an HTML string.
 *
 * Pipeline: remark-parse → remarkPlugins → remark-rehype → rehypePlugins →
 * (sanitizer when `sanitize: true`) → rehype-stringify
 *
 * **Trust model:** by default raw HTML is passed through unchanged, so only
 * use the default for trusted content. Set `sanitize: true` for anything else.
 *
 * @example
 * import { toHtml, remarkToc } from '@yamblog/remark';
 * const html = await toHtml(post.content, { remarkPlugins: [[remarkToc, { ids: true }]] });
 * const safe = await toHtml(untrusted, { sanitize: true });
 */
export async function toHtml(markdown: string, options: ToHtmlOptions = {}): Promise<string> {
  const { remarkPlugins = [], rehypePlugins = [], sanitize = false } = options;

  if (sanitize) {
    return String(
      await unified()
        .use(remarkParse)
        .use(remarkPlugins)
        .use(remarkRehype)
        .use(rehypePlugins)
        .use(rehypeSanitizeLite)
        .use(rehypeStringify)
        .process(markdown),
    );
  }

  return String(
    await unified()
      .use(remarkParse)
      .use(remarkPlugins)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypePlugins)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown),
  );
}
