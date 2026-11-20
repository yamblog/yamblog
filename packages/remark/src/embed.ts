import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Root, Paragraph, Html } from 'mdast';
import type { Plugin } from 'unified';

/** A hast-style element description: tag name plus properties. */
export type EmbedElement = {
  tagName: string;
  properties: Record<string, string | number | boolean>;
};

type EmbedProvider = {
  name: string;
  pattern: RegExp;
  /**
   * Returns the embed markup as an HTML string.
   *
   * A provider that only supplies `html` produces a raw `html` node, which is
   * only rendered by pipelines that allow raw HTML (`toHtml` without
   * `sanitize`, or react-markdown with `rehype-raw`).
   */
  html: (match: RegExpMatchArray) => string;
  /**
   * Optional structured form of the embed. When present it is used to render
   * a real element (via `data.hName` / `data.hProperties`), so the embed works
   * in react-markdown without `rehype-raw` and survives `toHtml({ sanitize: true })`
   * (for the built-in providers). Attribute values are escaped by the serializer.
   */
  element?: (match: RegExpMatchArray) => EmbedElement;
};

const YOUTUBE_PROPS = { width: '560', height: '315', title: 'YouTube video', frameBorder: '0' };
const CODEPEN_PROPS = { height: '300', style: 'width:100%', scrolling: 'no', title: 'CodePen embed', frameBorder: '0' };
const VIMEO_PROPS = { width: '640', height: '360', title: 'Vimeo video', frameBorder: '0' };

// Patterns are anchored to the start of the URL and to the provider's host
// (any subdomain allowed: www., m., …), so a provider URL that only appears
// in the query string of another site is not turned into an embed.
const DEFAULT_PROVIDERS: EmbedProvider[] = [
  {
    name: 'youtube',
    // Matches https://www.youtube.com/watch?v=ID and https://youtu.be/ID
    pattern: /^https?:\/\/(?:[a-z0-9-]+\.)*(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
    html: ([, id]) =>
      `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" ` +
      `title="YouTube video" frameborder="0" allowfullscreen></iframe>`,
    element: ([, id]) => ({
      tagName: 'iframe',
      properties: { ...YOUTUBE_PROPS, src: `https://www.youtube.com/embed/${id}`, allowFullScreen: true },
    }),
  },
  {
    name: 'codepen',
    // Matches https://codepen.io/user/pen/ID. The user segment is restricted to
    // the characters CodePen allows so it cannot break out of the attribute.
    pattern: /^https?:\/\/(?:[a-z0-9-]+\.)*codepen\.io\/([A-Za-z0-9_-]+)\/pen\/([a-zA-Z0-9]+)/i,
    html: ([, user, id]) =>
      `<iframe height="300" style="width:100%" scrolling="no" ` +
      `src="https://codepen.io/${user}/embed/${id}" ` +
      `title="CodePen embed" frameborder="0" allowfullscreen></iframe>`,
    element: ([, user, id]) => ({
      tagName: 'iframe',
      properties: { ...CODEPEN_PROPS, src: `https://codepen.io/${user}/embed/${id}`, allowFullScreen: true },
    }),
  },
  {
    name: 'vimeo',
    // Matches https://vimeo.com/ID
    pattern: /^https?:\/\/(?:[a-z0-9-]+\.)*vimeo\.com\/(\d+)/i,
    html: ([, id]) =>
      `<iframe src="https://player.vimeo.com/video/${id}" width="640" height="360" ` +
      `title="Vimeo video" frameborder="0" allowfullscreen></iframe>`,
    element: ([, id]) => ({
      tagName: 'iframe',
      properties: { ...VIMEO_PROPS, src: `https://player.vimeo.com/video/${id}`, allowFullScreen: true },
    }),
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
 * Supports YouTube, Vimeo, and CodePen out of the box. Built-in embeds render
 * as real `<iframe>` elements in `toHtml` (including `sanitize: true`) and in
 * react-markdown without `rehype-raw`. When serialised back to markdown the
 * iframe HTML is written out as before.
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
      // Already converted (e.g. plugin applied twice)
      if (node.data && (node.data as Record<string, unknown>).hName) return;

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
        if (!match) continue;

        const html: Html = { type: 'html', value: provider.html(match) };

        if (provider.element) {
          // Keep a paragraph wrapping the html string (so remark-stringify still
          // writes the iframe markup), but tell mdast-util-to-hast to render it
          // as a real element and to ignore the raw child.
          const el = provider.element(match);
          const embed: Paragraph = {
            type: 'paragraph',
            children: [html],
            data: {
              hName: el.tagName,
              hProperties: { ...el.properties },
              hChildren: [],
            } as Paragraph['data'],
          };
          (parent.children as unknown[])[index] = embed;
        } else {
          // Custom string-only provider: raw html node (needs raw HTML support)
          (parent.children as unknown[])[index] = html;
        }
        return;
      }
    });
  };
};
