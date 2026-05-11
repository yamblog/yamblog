import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import type { Plugin } from 'unified';

type DirectiveNode = {
  type: 'leafDirective' | 'containerDirective' | 'textDirective';
  name: string;
  attributes?: Record<string, string | null | undefined>;
  children: unknown[];
};

/**
 * Remark plugin that transforms `::component-name{prop=val}` directives into
 * self-closing HTML elements, which ReactMarkdown (with `rehype-raw`) renders
 * as custom components via its `components` prop.
 *
 * **Requires `remark-directive` to be used first in the pipeline.**
 *
 * @example
 * // markdown
 * ::counter-demo{start=0 step=1}
 *
 * // rendered HTML
 * <counter-demo start="0" step="1" />
 *
 * // ReactMarkdown usage
 * import { remark } from 'remark';
 * import remarkDirective from 'remark-directive';
 * import { remarkInteractive } from '@yamblog/remark';
 * import rehypeRaw from 'rehype-raw';
 *
 * <ReactMarkdown
 *   remarkPlugins={[remarkDirective, remarkInteractive]}
 *   rehypePlugins={[rehypeRaw]}
 *   components={{ 'counter-demo': CounterDemo }}
 * >
 *   {post.content}
 * </ReactMarkdown>
 */
export const remarkInteractive: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, (node) => {
      const n = node as unknown as DirectiveNode;
      if (
        n.type !== 'leafDirective' &&
        n.type !== 'containerDirective' &&
        n.type !== 'textDirective'
      ) return;

      const attrs = Object.entries(n.attributes ?? {})
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
        .join(' ');

      const tag = n.name;
      const html = attrs ? `<${tag} ${attrs} />` : `<${tag} />`;

      // Mutate in place — unist-util-visit does not support node replacement
      (node as unknown as Record<string, unknown>).type = 'html';
      (node as unknown as Record<string, unknown>).value = html;
      (node as unknown as DirectiveNode).children = [];
    });
  };
};
