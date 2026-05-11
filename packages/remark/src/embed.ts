import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Root, Paragraph } from 'mdast';
import type { Plugin } from 'unified';

type EmbedProvider = {
  name: string;
  pattern: RegExp;
  html: (match: RegExpMatchArray) => string;
};

const DEFAULT_PROVIDERS: EmbedProvider[] = [
  {
    name: 'youtube',
    // Matches https://www.youtube.com/watch?v=ID and https://youtu.be/ID
    pattern: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    html: ([, id]) =>
      `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" ` +
      `title="YouTube video" frameborder="0" allowfullscreen></iframe>`,
  },
  {
    name: 'codepen',
    // Matches https://codepen.io/user/pen/ID
    pattern: /codepen\.io\/([^/\s]+)\/pen\/([a-zA-Z0-9]+)/,
    html: ([, user, id]) =>
      `<iframe height="300" style="width:100%" scrolling="no" ` +
      `src="https://codepen.io/${user}/embed/${id}" ` +
      `title="CodePen embed" frameborder="0" allowfullscreen></iframe>`,
  },
  {
    name: 'vimeo',
    // Matches https://vimeo.com/ID
    pattern: /vimeo\.com\/(\d+)/,
    html: ([, id]) =>
      `<iframe src="https://player.vimeo.com/video/${id}" width="640" height="360" ` +
      `frameborder="0" allowfullscreen></iframe>`,
  },
];

export type RemarkEmbedOptions = {
  /**
   * Override or extend the default set of providers.
   * Pass `providers: []` to disable all defaults and supply your own.
   */
  providers?: EmbedProvider[];
};

/**
 * Remark plugin that converts bare embed URLs into iframes.
 *
 * A "bare URL" is a paragraph whose sole content is a single plain-text URL
 * (or a plain link with no label text other than the URL itself).
 *
 * Supports YouTube, Vimeo, and CodePen out of the box.
 *
 * @example
 * // markdown
 * https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *
 * // output HTML
 * <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" ... />
 *
 * // usage
 * import { remark } from 'remark';
 * import { remarkEmbed } from '@yamblog/remark';
 * const result = await remark().use(remarkEmbed).process(md);
 */
export const remarkEmbed: Plugin<[RemarkEmbedOptions?], Root> = (options = {}) => {
  const providers = options.providers ?? DEFAULT_PROVIDERS;

  return (tree: Root) => {
    visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
      if (!parent || index == null) return;

      // The paragraph must consist of exactly one child
      if (node.children.length !== 1) return;

      const child = node.children[0];

      // Accept: plain text node that looks like a URL, or an autolink / plain link
      let url: string | null = null;
      if (child.type === 'text') {
        const trimmed = child.value.trim();
        // Only treat as embeddable if the entire paragraph is a single URL token
        if (/^\S+$/.test(trimmed) && /^https?:\/\//i.test(trimmed)) {
          url = trimmed;
        }
      } else if (child.type === 'link') {
        // Only embed if the link text is the URL itself (bare autolink)
        const label = toString(child).trim();
        if (label === child.url) url = child.url;
      }

      if (!url) return;

      for (const provider of providers) {
        const match = url.match(provider.pattern);
        if (match) {
          // Replace the paragraph node with an html node
          (parent.children as unknown[])[index] = {
            type: 'html',
            value: provider.html(match),
          };
          return;
        }
      }
    });
  };
};
