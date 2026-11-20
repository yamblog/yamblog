# @yamblog/remark

[![npm](https://img.shields.io/npm/v/%40yamblog%2Fremark)](https://www.npmjs.com/package/@yamblog/remark) [![downloads](https://img.shields.io/npm/dm/%40yamblog%2Fremark)](https://www.npmjs.com/package/@yamblog/remark)

Remark plugins and markdown-to-HTML conversion for `@yamblog`.

## Install

```bash
npm install @yamblog/remark
```

`remark` and `remark-directive` are optional peer dependencies: install `remark` if you run the plugins through `remark()` yourself, and `remark-directive` if you use `remarkInteractive`. `toHtml` needs neither.

## `toHtml` — markdown to HTML

Converts a markdown string to HTML using a unified pipeline. Accepts remark and rehype plugins so you can compose any of the plugins in this package.

```ts
import { toHtml } from '@yamblog/remark';

const html = await toHtml(post.content);
```

### With plugins

```ts
import { toHtml, remarkToc, remarkEmbed } from '@yamblog/remark';

const html = await toHtml(post.content, {
  remarkPlugins: [[remarkToc, { ids: true }], remarkEmbed],
});
```

### With plugin options

```ts
import { toHtml, remarkToc } from '@yamblog/remark';

const html = await toHtml(post.content, {
  remarkPlugins: [[remarkToc, { heading: 'Contents', maxDepth: 4, ids: true }]],
});
```

### API

```ts
toHtml(markdown: string, options?: ToHtmlOptions): Promise<string>

type ToHtmlOptions = {
  remarkPlugins?: PluggableList; // inserted before remark-rehype
  rehypePlugins?: PluggableList; // inserted before rehype-stringify
  sanitize?: boolean;            // default false, see "Content trust" below
};
```

### Content trust and `sanitize`

By default `toHtml` is meant for **content written by trusted authors**: raw HTML in the markdown is passed through verbatim and link/image URLs are not filtered. So `<script>…</script>`, `<img onerror=…>` and `[x](javascript:…)` all end up live in the output, and anything you inject with `set:html` or `dangerouslySetInnerHTML` runs in your page.

If posts can come from anyone you do not fully trust (a CMS with many editors, user submissions, AI-agent-written posts, imported content), pass `sanitize: true`:

```ts
const html = await toHtml(post.content, {
  remarkPlugins: [remarkEmbed, [remarkToc, { ids: true }]],
  sanitize: true,
});
```

With `sanitize: true`:

- raw HTML in the markdown is not passed through (inline HTML disappears; code blocks and inline code are still shown);
- after your `rehypePlugins` have run, script-capable and document-level elements (`script`, `style`, `iframe`, `object`, `embed`, `form`, `svg`, `math`, `link`, `meta`, `base`, …) are removed with their content, as are `on*` event handlers, `style` and `srcdoc` attributes;
- URLs in `href`, `src` and similar attributes are removed unless they are relative or use `http`, `https`, `mailto` or `tel` (so `javascript:`, `data:` and `vbscript:` links are dropped and the link text is kept);
- the built-in `remarkEmbed` players (YouTube, Vimeo, CodePen iframes) keep working. Custom embed providers that only return an HTML string are dropped, as is `remarkInteractive` output unless you use its `output: 'element'` mode.

`sanitize` defaults to `false` so existing posts that rely on inline HTML keep rendering. It is a lightweight built-in filter; if you need a configurable policy, keep `sanitize: false` and add [`rehype-sanitize`](https://github.com/rehypejs/rehype-sanitize) to `rehypePlugins` yourself (its default schema removes iframes, so extend it if you use `remarkEmbed`).

`react-markdown` (and `MarkdownRenderer` from `@yamblog/react`) is safe by default: it shows raw HTML as text and filters dangerous URLs. Adding `rehype-raw` turns raw HTML back on, so only do that for trusted content (or pair it with `rehype-sanitize`).

### With `@yamblog/astro`

The Astro `BlogPostPage` component calls `toHtml(post.content)` itself and does not take plugin props, so to use these plugins render the post body in your own page:

```astro
---
import { toHtml, remarkToc, remarkEmbed } from '@yamblog/remark';
const { post } = Astro.props;
const html = await toHtml(post.content, {
  remarkPlugins: [[remarkToc, { ids: true }], remarkEmbed],
});
---
<article set:html={html} />
```

---

## `remarkToc` — auto table of contents

Scans headings in your markdown and replaces a designated placeholder heading with a nested list of anchor links.

### Usage

```ts
import { remark } from 'remark';
import { remarkToc } from '@yamblog/remark';

const output = await remark().use(remarkToc).process(markdown);
```

### Markdown format

Add a heading with the text `Table of Contents` (case-insensitive) where you want the TOC to appear:

```markdown
# My Post

## Table of Contents

## Introduction

Content here.

## Usage

### Basic

More content.
```

The plugin replaces the first `## Table of Contents` heading (wherever it is, including inside a blockquote) with:

```markdown
- [Introduction](#introduction)
- [Usage](#usage)
  - [Basic](#basic)
```

### Heading ids

The links point at heading anchors, but by default nothing creates those anchors: `toHtml` and react-markdown render plain `<h2>` elements. Pass `ids: true` and the plugin also gives every heading an `id` that matches its TOC link:

```ts
const html = await toHtml(markdown, {
  remarkPlugins: [[remarkToc, { ids: true }]],
});
// <li><a href="#introduction">Introduction</a></li> … <h2 id="introduction">Introduction</h2>
```

With `ids: true`, slugs come from [`github-slugger`](https://github.com/Flet/github-slugger), the algorithm used by GitHub and `rehype-slug`: non-ASCII text is kept (`## 日本語` → `#日本語`) and duplicate headings get `-1`, `-2`, … suffixes. A heading that already has an id keeps it. Without `ids`, the plugin keeps the earlier ASCII-only slugs (`A & B` → `#a-b`) and does not de-duplicate, so pair it with your own id plugin if you need one; note that `rehype-slug` uses github-slugger and may disagree with those legacy slugs.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `heading` | `string` | `"Table of Contents"` | Placeholder heading text to replace |
| `minDepth` | `number` | `2` | Shallowest heading level to include |
| `maxDepth` | `number` | `3` | Deepest heading level to include |
| `ids` | `boolean` | `false` | Add matching `id` attributes to headings (github-slugger slugs) |

```ts
remark().use(remarkToc, {
  heading: 'Contents',
  maxDepth: 4,
})
```

---

## `remarkInteractive` — directives to React components

Transforms `::component-name{prop=val}` directive syntax into HTML elements that ReactMarkdown renders via its `components` prop.

**Requires `remark-directive` before it in the plugin pipeline** (`remark-directive` is an optional peer dependency: install it when you use this plugin).

### Usage

Recommended: list your components and emit real elements, so no `rehype-raw` is needed:

```tsx
import ReactMarkdown from 'react-markdown';
import remarkDirective from 'remark-directive';
import { remarkInteractive } from '@yamblog/remark';

<ReactMarkdown
  remarkPlugins={[
    remarkDirective,
    [remarkInteractive, { components: ['counter-demo'], output: 'element' }],
  ]}
  components={{ 'counter-demo': CounterDemo }}
>
  {post.content}
</ReactMarkdown>
```

The default output is raw HTML strings, which react-markdown only renders with `rehype-raw`:

```tsx
import rehypeRaw from 'rehype-raw';

<ReactMarkdown
  remarkPlugins={[remarkDirective, remarkInteractive]}
  rehypePlugins={[rehypeRaw]} // re-enables ALL raw HTML in the post: trusted content only
  components={{ 'counter-demo': CounterDemo }}
>
  {post.content}
</ReactMarkdown>
```

### Markdown syntax

```markdown
::counter-demo{start=0 step=1}

::alert{type=warning message="Something happened"}

:::note{.warn}
Directive **content** is kept.
:::
```

Renders as `<counter-demo start="0" step="1"></counter-demo>`, `<alert type="warning" message="Something happened"></alert>` and `<note class="warn"><p>Directive <strong>content</strong> is kept.</p></note>`. Container directive children and `[label]` text become the element's children. Void elements such as `::hr` stay self-closing.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `components` | `string[]` | all directives | Allow-list of directive names to convert. Other text directives are turned back into their source text (so prose such as `ratio a:b`, which `remark-directive` parses as a `:b` directive, reads as written); other leaf/container directives are left as plain directives. Even without an allow-list, a bare text directive glued to a word (`a:b`, `javascript:alert(1)`) is restored to its text. |
| `output` | `'html' \| 'element'` | `'html'` | `'html'` emits raw HTML strings (needs raw HTML support). `'element'` emits real elements via `data.hName`, works in react-markdown without `rehype-raw`, survives `toHtml({ sanitize: true })` and drops `on*` attributes. |

**Always refused:** directives named `script`, `iframe`, `object`, `embed`, `style`, `link`, `meta` or `base` (any case) are never converted, in any mode, because they would produce live script, frame or document-metadata tags. The list is exported as `REFUSED_DIRECTIVE_NAMES`.

Without `components`, every other directive name becomes an element with the attributes the author wrote, so only use the default for trusted content, or combine `components` with `output: 'element'` and `toHtml({ sanitize: true })`.

---

## `remarkEmbed` — oEmbed URL transforms

Converts bare URLs on their own line into iframes. Supports YouTube, Vimeo, and CodePen out of the box.

Built-in embeds are emitted as real `<iframe>` elements (via `data.hName` / `data.hProperties`), so they render in `toHtml` (including `sanitize: true`) and in react-markdown / `MarkdownRenderer` **without** `rehype-raw`. Serialised back to markdown with `remark()`, the iframe HTML is written out as before.

```ts
const html = await toHtml(post.content, { remarkPlugins: [remarkEmbed] });
```

### Usage

```ts
import { remark } from 'remark';
import { remarkEmbed } from '@yamblog/remark';

const result = await remark().use(remarkEmbed).process(markdown);
```

### Supported providers

| Provider | Example URL |
|----------|-------------|
| YouTube | `https://www.youtube.com/watch?v=ID` or `https://youtu.be/ID` |
| Vimeo | `https://vimeo.com/ID` |
| CodePen | `https://codepen.io/user/pen/ID` |

The URL must start with `http(s)://` followed by the provider's host (any subdomain, e.g. `m.youtube.com`); a provider URL inside another site's query string is not embedded.

### Custom providers

```ts
remark().use(remarkEmbed, {
  providers: [
    {
      name: 'my-service',
      pattern: /my-service\.com\/embed\/(\d+)/,
      html: ([, id]) => `<iframe src="https://my-service.com/embed/${id}"></iframe>`,
      // Optional: a structured form, rendered as a real element (attributes are
      // escaped for you) so it also works in react-markdown without rehype-raw.
      element: ([, id]) => ({
        tagName: 'iframe',
        properties: { src: `https://my-service.com/embed/${id}`, title: 'My service' },
      }),
    },
  ],
})
```

A custom provider with only `html` produces a raw HTML node: it renders through `toHtml` (default mode) but needs `rehype-raw` in react-markdown and is removed by `toHtml({ sanitize: true })`. Captured URL parts are inserted into your string as is, so validate or escape them in your pattern. With `sanitize: true`, iframes are kept only for the built-in YouTube, Vimeo and CodePen player URLs.
