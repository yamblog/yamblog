import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import type { Root, Heading, List, ListItem, Paragraph, Link, Text, Parent } from 'mdast';
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
  /**
   * Give every heading an `id` (through `data.hProperties.id`) and point the
   * TOC links at those ids, so the links work in `toHtml` and react-markdown
   * without `rehype-slug`.
   *
   * Slugs are generated with `github-slugger` (the same algorithm as
   * `rehype-slug` / GitHub): Unicode text is kept and duplicate headings get
   * `-1`, `-2`, … suffixes. A heading that already has an id keeps it.
   *
   * Default: `false` (no ids are added and links use the legacy ASCII slug,
   * as in earlier versions). Turning it on can change some TOC hrefs, for
   * example `A & B` links to `#a--b` instead of `#a-b`.
   */
  ids?: boolean;
};

/** Legacy ASCII slug used when `ids` is off (kept for backwards compatibility). */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s]+/g, '-');
}

function existingId(node: Heading): string | undefined {
  const props = (node.data as { hProperties?: Record<string, unknown> } | undefined)?.hProperties;
  const id = props?.id;
  return typeof id === 'string' && id ? id : undefined;
}

/**
 * Remark plugin that auto-generates a table of contents.
 *
 * Scans all headings in the document and inserts an unordered list of anchor
 * links in place of the first heading whose text matches `options.heading`
 * (default: "Table of Contents").
 *
 * The links point at heading anchors. Pass `{ ids: true }` to have the plugin
 * add matching `id` attributes to the headings; otherwise you need something
 * like `rehype-slug` to create them.
 *
 * @example
 * // In markdown:
 * // ## Table of Contents
 * // ## Introduction
 * // ## Usage
 * // ### Basic
 *
 * import { toHtml, remarkToc } from '@yamblog/remark';
 * const html = await toHtml(markdown, { remarkPlugins: [[remarkToc, { ids: true }]] });
 */
export const remarkToc: Plugin<[RemarkTocOptions?], Root> = (options = {}) => {
  const {
    heading = 'Table of Contents',
    maxDepth = 3,
    minDepth = 2,
    ids = false,
  } = options;

  return (tree: Root) => {
    // 1. Collect all headings (excluding the TOC placeholder itself)
    const headings: { depth: number; text: string; slug: string }[] = [];
    // Escape regex metacharacters — `heading` is user input, not a pattern
    const headingPattern = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    let placeholder: { parent: Parent; node: Heading } | null = null;
    const slugger = new GithubSlugger();

    visit(tree, 'heading', (node: Heading, _index, parent) => {
      const text = toString(node);
      if (headingPattern.test(text)) {
        // Only the first placeholder is replaced; later ones are left as
        // headings. No placeholder is listed in the TOC.
        if (!placeholder && parent) placeholder = { parent: parent as Parent, node };
        return;
      }

      let slug: string;
      if (ids) {
        const current = existingId(node);
        if (current) {
          slugger.slug(current); // reserve it so later duplicates are suffixed
          slug = current;
        } else {
          slug = slugger.slug(text);
          node.data = {
            ...(node.data ?? {}),
            hProperties: {
              ...((node.data as { hProperties?: Record<string, unknown> } | undefined)?.hProperties ?? {}),
              id: slug,
            },
          } as Heading['data'];
        }
      } else {
        slug = slugify(text);
      }

      if (node.depth >= minDepth && node.depth <= maxDepth) {
        headings.push({ depth: node.depth, text, slug });
      }
    });

    const found = placeholder as { parent: Parent; node: Heading } | null;
    if (!found || headings.length === 0) return;

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

    // 3. Replace the placeholder heading (in its own parent) with the TOC list
    const siblings = found.parent.children as unknown[];
    const at = siblings.indexOf(found.node);
    if (at !== -1) siblings.splice(at, 1, tocList);
  };
};
