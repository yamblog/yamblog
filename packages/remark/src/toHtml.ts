import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import type { PluggableList } from 'unified';

export type ToHtmlOptions = {
  /** Remark plugins inserted before remark-rehype */
  remarkPlugins?: PluggableList;
  /** Rehype plugins inserted before rehype-stringify */
  rehypePlugins?: PluggableList;
};

/**
 * Converts a markdown string to an HTML string.
 *
 * Pipeline: remark-parse → remarkPlugins → remark-rehype → rehypePlugins → rehype-stringify
 *
 * @example
 * import { toHtml, remarkToc } from '@yamblog/remark';
 * const html = await toHtml(post.content, { remarkPlugins: [remarkToc] });
 */
export async function toHtml(markdown: string, options: ToHtmlOptions = {}): Promise<string> {
  const { remarkPlugins = [], rehypePlugins = [] } = options;
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
