/**
 * A small, dependency-free hast sanitizer used by `toHtml({ sanitize: true })`.
 *
 * It runs after raw HTML has already been dropped (remark-rehype without
 * `allowDangerousHtml`), so it only has to deal with elements created from
 * markdown and by plugins (`data.hName` / `data.hProperties`, rehype plugins).
 *
 * - removes script-capable / document-level elements with their content
 *   (`script`, `style`, `object`, `embed`, `iframe` except known embed
 *   players, `form`, `svg`, `math`, …) and any `raw` or `comment` node;
 * - removes `on*` event handler, `srcdoc` and `style` attributes (`style` is
 *   kept on allowed embed iframes);
 * - removes URL attributes (`href`, `src`, …) whose scheme is not `http`,
 *   `https`, `mailto` or `tel` (relative URLs and fragments are kept), so
 *   `javascript:`, `vbscript:` and `data:` URLs are dropped.
 */

type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const DROPPED_ELEMENTS = new Set([
  'script',
  'style',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'link',
  'meta',
  'base',
  'noscript',
  'template',
  'form',
  'svg',
  'math',
]);

/** Players emitted by remarkEmbed's built-in providers. */
const ALLOWED_IFRAME_SRC = [
  /^https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]+$/,
  /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]+$/,
  /^https:\/\/codepen\.io\/[A-Za-z0-9_-]+\/embed\/[A-Za-z0-9]+$/,
  /^https:\/\/player\.vimeo\.com\/video\/\d+$/,
];

const URL_PROPERTIES = new Set([
  'href',
  'src',
  'srcset',
  'cite',
  'action',
  'formaction',
  'poster',
  'background',
  'longdesc',
  'lowsrc',
  'dynsrc',
  'xlinkhref',
  'xmlbase',
  'codebase',
  'data',
  'manifest',
  'ping',
  'icon',
  'profile',
  'usemap',
  'itemid',
  'itemtype',
]);

const SAFE_PROTOCOLS = new Set(['http', 'https', 'mailto', 'tel']);

/** True when a URL is relative or uses an allowed scheme. */
export function isSafeUrl(value: string): boolean {
  // Browsers ignore leading/trailing C0 controls and spaces and strip tabs and
  // newlines anywhere in the URL before parsing the scheme.
  // eslint-disable-next-line no-control-regex
  const url = value.replace(/[\u0000- \u007F-\u009F]/g, '');
  const colon = url.indexOf(':');
  if (colon === -1) return true;
  const firstDelimiter = url.search(/[/?#]/);
  if (firstDelimiter !== -1 && firstDelimiter < colon) return true;
  return SAFE_PROTOCOLS.has(url.slice(0, colon).toLowerCase());
}

function isSafeUrlValue(key: string, value: unknown): boolean {
  const values = Array.isArray(value) ? value : [value];
  for (const v of values) {
    if (v == null || typeof v === 'boolean') continue;
    const s = String(v);
    if (key === 'srcset') {
      for (const candidate of s.split(',')) {
        const url = candidate.trim().split(/\s+/)[0] ?? '';
        if (url && !isSafeUrl(url)) return false;
      }
    } else if (key === 'ping') {
      for (const url of s.split(/\s+/)) if (url && !isSafeUrl(url)) return false;
    } else if (!isSafeUrl(s)) {
      return false;
    }
  }
  return true;
}

function isAllowedIframe(node: HastNode): boolean {
  const src = node.properties?.src;
  return typeof src === 'string' && ALLOWED_IFRAME_SRC.some((re) => re.test(src));
}

function cleanProperties(node: HastNode, keepStyle: boolean): void {
  const props = node.properties;
  if (!props) return;
  for (const key of Object.keys(props)) {
    const k = key.toLowerCase().replace(/[^a-z]/g, '');
    if (
      k.startsWith('on') ||
      k === 'srcdoc' ||
      (k === 'style' && !keepStyle) ||
      (URL_PROPERTIES.has(k) && !isSafeUrlValue(k, props[key]))
    ) {
      delete props[key];
    }
  }
}

function clean(parent: HastNode): void {
  if (!parent.children) return;
  const kept: HastNode[] = [];
  for (const child of parent.children) {
    if (child.type === 'raw' || child.type === 'comment' || child.type === 'doctype') continue;
    if (child.type === 'element') {
      const tag = String(child.tagName ?? '').toLowerCase();
      const allowedIframe = tag === 'iframe' && isAllowedIframe(child);
      if (DROPPED_ELEMENTS.has(tag) && !allowedIframe) continue;
      if (tag === 'input') {
        // Only GFM task-list checkboxes are kept, and always disabled.
        const type = String(child.properties?.type ?? '').toLowerCase();
        if (type !== 'checkbox') continue;
        child.properties = { ...child.properties, disabled: true };
      }
      cleanProperties(child, allowedIframe);
      if (allowedIframe) child.children = [];
    }
    clean(child);
    kept.push(child);
  }
  parent.children = kept;
}

/** Unified (rehype) plugin wrapping {@link clean}. */
export function rehypeSanitizeLite() {
  return (tree: unknown) => {
    clean(tree as HastNode);
  };
}
