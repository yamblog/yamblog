import type { Root } from 'mdast';
import type { Plugin } from 'unified';

/** Minimal view of the vfile passed to transformers. */
type VFile = { value?: unknown };

type DirectiveType = 'leafDirective' | 'containerDirective' | 'textDirective';

type DirectiveNode = {
  type: DirectiveType;
  name: string;
  attributes?: Record<string, string | null | undefined> | null;
  children: AnyNode[];
  data?: Record<string, unknown>;
  position?: { start: { offset?: number }; end: { offset?: number } };
};

type AnyNode = {
  type: string;
  value?: string;
  children?: AnyNode[];
  data?: Record<string, unknown>;
  position?: { start: { offset?: number }; end: { offset?: number } };
};

export type RemarkInteractiveOptions = {
  /**
   * Allow-list of directive names to convert. When set, only these directives
   * become elements: other text directives (for example the `:b` in prose such
   * as `a:b`) are turned back into their original text, and other leaf and
   * container directives are left untouched.
   *
   * Default: every directive is converted (except the always-refused names
   * listed in {@link REFUSED_DIRECTIVE_NAMES}).
   */
  components?: string[];
  /**
   * How converted directives are emitted.
   *
   * - `'html'` (default): raw HTML strings (`<name attr="…"></name>`). Needs a
   *   pipeline that renders raw HTML (`toHtml`, or react-markdown with
   *   `rehype-raw`). Dropped by `toHtml({ sanitize: true })`.
   * - `'element'`: real elements via `data.hName` / `data.hProperties`. Works
   *   in react-markdown without `rehype-raw`, survives `toHtml({ sanitize: true })`,
   *   and drops `on*` event-handler attributes.
   */
  output?: 'html' | 'element';
};

/**
 * Directive names that are never converted, in any mode, because they would
 * produce live script, frame, plugin, style or document-metadata tags and can
 * never be a legitimate interactive component. Leaf and container directives
 * with these names are left as plain directives; text directives are restored
 * to their source text.
 */
export const REFUSED_DIRECTIVE_NAMES: readonly string[] = [
  'script',
  'iframe',
  'object',
  'embed',
  'style',
  'link',
  'meta',
  'base',
];

const REFUSED = new Set(REFUSED_DIRECTIVE_NAMES);

function isDirective(node: AnyNode): node is AnyNode & DirectiveNode {
  return (
    node.type === 'leafDirective' ||
    node.type === 'containerDirective' ||
    node.type === 'textDirective'
  );
}

const VOID_ELEMENTS = new Set([
  'area', 'br', 'col', 'hr', 'img', 'input', 'source', 'track', 'wbr',
]);

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/** Valid HTML attribute name (remark-directive already constrains these). */
// eslint-disable-next-line no-control-regex
const ATTR_NAME = /^[^\s"'>/=\u0000-\u001F\u007F]+$/;

function attributeEntries(node: DirectiveNode): [string, string][] {
  return Object.entries(node.attributes ?? {})
    .filter((entry): entry is [string, string] => entry[1] != null)
    .map(([k, v]): [string, string] => [k, String(v)])
    .filter(([k]) => ATTR_NAME.test(k));
}

/** Best-effort source text of a text directive that is not converted. */
function sourceText(node: DirectiveNode, file: VFile | undefined): string {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  const doc = file ? String(file.value ?? '') : '';
  if (doc && typeof start === 'number' && typeof end === 'number' && end <= doc.length) {
    return doc.slice(start, end);
  }
  const label = node.children.length
    ? `[${node.children.map(plainText).join('')}]`
    : '';
  const attrs = attributeEntries(node);
  const attrText = attrs.length
    ? `{${attrs.map(([k, v]) => `${k}="${v.replace(/"/g, '&quot;')}"`).join(' ')}}`
    : '';
  return `:${node.name}${label}${attrText}`;
}

/**
 * True for a bare text directive (no `[label]`, no `{attributes}`) glued to
 * the end of a word, such as the `:b` in `a:b` or `:alert` in
 * `javascript:alert(1)`. That is prose, not a component, so it is restored
 * even when no `components` allow-list is given.
 */
function isMidWordProse(node: DirectiveNode, previous: AnyNode | undefined): boolean {
  if (node.type !== 'textDirective') return false;
  if (node.children.length > 0 || attributeEntries(node).length > 0) return false;
  if (!previous || previous.type !== 'text' || typeof previous.value !== 'string') return false;
  if (!/[\p{L}\p{N}_]$/u.test(previous.value)) return false;
  const prevEnd = previous.position?.end.offset;
  const start = node.position?.start.offset;
  return typeof prevEnd !== 'number' || typeof start !== 'number' || prevEnd === start;
}

function plainText(node: AnyNode): string {
  if (typeof node.value === 'string') return node.value;
  return (node.children ?? []).map(plainText).join('');
}

function toElement(node: DirectiveNode): void {
  const properties: Record<string, unknown> = {};
  for (const [k, v] of attributeEntries(node)) {
    if (/^on/i.test(k)) continue;
    if (k === 'class') properties.className = v.split(/\s+/).filter(Boolean);
    else properties[k] = v;
  }
  node.data = { ...(node.data ?? {}), hName: node.name, hProperties: properties };
}

function toHtmlNodes(node: DirectiveNode): AnyNode[] {
  const attrs = attributeEntries(node)
    .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
    .join(' ');
  const tag = node.name;
  const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
  const close = `</${tag}>`;

  if (node.children.length === 0) {
    // Void elements keep the `<tag />` form; every other element gets an
    // explicit closing tag, because `<tag />` is not self-closing for
    // non-void elements in HTML and would swallow the content after it.
    if (VOID_ELEMENTS.has(tag.toLowerCase())) {
      return [{ type: 'html', value: attrs ? `<${tag} ${attrs} />` : `<${tag} />` }];
    }
    return [{ type: 'html', value: open + close }];
  }
  const parts: AnyNode[] = [
    { type: 'html', value: open },
    ...node.children,
    { type: 'html', value: close },
  ];
  if (node.type === 'leafDirective') {
    // A leaf directive's label is phrasing content: keep it in a paragraph.
    return [{ type: 'paragraph', children: parts }];
  }
  return parts;
}

/**
 * Remark plugin that transforms `::component-name{prop=val}` directives into
 * HTML elements, which ReactMarkdown renders as custom components via its
 * `components` prop.
 *
 * Directive content is preserved: a container directive's children and a
 * leaf/text directive's `[label]` become the element's children.
 *
 * Names in {@link REFUSED_DIRECTIVE_NAMES} (`script`, `iframe`, `object`,
 * `embed`, `style`, `link`, `meta`, `base`) are never converted.
 *
 * **Requires `remark-directive` to be used first in the pipeline.**
 *
 * @example
 * // markdown
 * ::counter-demo{start=0 step=1}
 *
 * // rendered HTML
 * <counter-demo start="0" step="1"></counter-demo>
 *
 * // ReactMarkdown usage (no rehype-raw needed with output: 'element')
 * import remarkDirective from 'remark-directive';
 * import { remarkInteractive } from '@yamblog/remark';
 *
 * <ReactMarkdown
 *   remarkPlugins={[
 *     remarkDirective,
 *     [remarkInteractive, { components: ['counter-demo'], output: 'element' }],
 *   ]}
 *   components={{ 'counter-demo': CounterDemo }}
 * >
 *   {post.content}
 * </ReactMarkdown>
 */
export const remarkInteractive: Plugin<[RemarkInteractiveOptions?], Root> = (options = {}) => {
  const allow = options.components ? new Set(options.components) : null;
  const output = options.output ?? 'html';

  function isConverted(name: string): boolean {
    if (REFUSED.has(name.toLowerCase())) return false;
    return allow ? allow.has(name) : true;
  }

  function walk(parent: AnyNode, file: VFile | undefined): void {
    const children = parent.children;
    if (!children) return;
    const next: AnyNode[] = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      // Post-order: nested directives are handled before their parent.
      walk(child, file);

      if (!isDirective(child)) {
        next.push(child);
        continue;
      }

      if (!isConverted(child.name) || (!allow && isMidWordProse(child, children[i - 1]))) {
        if (child.type === 'textDirective') {
          // Restore prose like `ratio a:b` that remark-directive parsed as `:b`
          next.push({ type: 'text', value: sourceText(child, file) });
        } else {
          next.push(child);
        }
        continue;
      }

      if (output === 'element') {
        toElement(child);
        next.push(child);
      } else {
        next.push(...toHtmlNodes(child));
      }
    }
    parent.children = next;
  }

  return (tree: Root, file?: VFile) => {
    walk(tree as unknown as AnyNode, file);
  };
};
