import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Root, Heading, List, ListItem, Paragraph, Link, Text } from 'mdast';
import type { Plugin } from 'unified';

export type RemarkTocOptions = {
  /**
   * Text of the heading that will be replaced with the TOC list.
   * Default: 'Table of Contents'
   */
  heading?: string;
  /** Deepest heading level to include. Default: 3 */
  maxDepth?: number;
  /** Shallowest heading level to include. Default: 2 */
  minDepth?: number;
};

/** Converts heading text to a GitHub-style anchor slug */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s]+/g, '-');
}

/**
 * Remark plugin that auto-generates a table of contents.
 *
 * Scans all headings in the document and inserts an ordered list of anchor
 * links in place of the first heading whose text matches `options.heading`
 * (default: "Table of Contents").
 *
 * @example
 * // In markdown:
 * // ## Table of Contents
 * // ## Introduction
 * // ## Usage
 * // ### Basic
 *
 * import { remark } from 'remark';
 * import { remarkToc } from '@yamblog/remark';
 * const result = await remark().use(remarkToc).process(markdown);
 */
export const remarkToc: Plugin<[RemarkTocOptions?], Root> = (options = {}) => {
  const {
    heading = 'Table of Contents',
    maxDepth = 3,
    minDepth = 2,
  } = options;

  return (tree: Root) => {
    // 1. Collect all headings (excluding the TOC placeholder itself)
    const headings: { depth: number; text: string; slug: string }[] = [];
    const headingPattern = new RegExp(`^${heading}$`, 'i');
    let tocIndex = -1;
    let tocNode: Heading | null = null;

    visit(tree, 'heading', (node: Heading, index) => {
      const text = toString(node);
      if (headingPattern.test(text)) {
        tocIndex = index as number;
        tocNode = node;
        return;
      }
      if (node.depth >= minDepth && node.depth <= maxDepth) {
        headings.push({ depth: node.depth, text, slug: slugify(text) });
      }
    });

    if (tocIndex === -1 || headings.length === 0) return;

    // 2. Build nested list structure
    const minFound = Math.min(...headings.map(h => h.depth));

    function buildList(items: typeof headings): List {
      const list: List = { type: 'list', ordered: false, spread: false, children: [] };
      let i = 0;

      while (i < items.length) {
        const item = items[i];
        const textNode: Text = { type: 'text', value: item.text };
        const link: Link = {
          type: 'link',
          url: `#${item.slug}`,
          title: null,
          children: [textNode],
        };
        const para: Paragraph = { type: 'paragraph', children: [link] };
        const listItem: ListItem = { type: 'listItem', spread: false, children: [para] };

        // Collect deeper children
        const nested: typeof headings = [];
        i++;
        while (i < items.length && items[i].depth > item.depth) {
          nested.push(items[i]);
          i++;
        }
        if (nested.length > 0) {
          listItem.children.push(buildList(nested));
        }

        list.children.push(listItem);
      }
      return list;
    }

    // Normalise to start from depth 0 for nesting purposes
    const normalised = headings.map(h => ({ ...h, depth: h.depth - minFound }));
    const tocList = buildList(normalised);

    // 3. Replace the placeholder heading with the TOC list
    (tree.children as Root['children']).splice(tocIndex, 1, tocList);
  };
};
