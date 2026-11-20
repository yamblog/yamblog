---
title: Security and Content Trust
description: What yamblog does and does not protect against, and how to render posts from authors you do not fully trust.
---

# Security and content trust

yamblog turns markdown files into HTML, feeds and structured data. How safe that
output is depends on **who writes the posts**. This page explains the trust model
and the options that make untrusted content safe to render.

## The trust model in one paragraph

By default yamblog treats post files like source code: whoever can commit a
markdown file can put HTML, links and metadata on your site. That is the right
default for a personal or team blog in git. It is **not** safe for content from a
CMS with many editors, user submissions, imported posts, or posts written by an AI
agent that reads untrusted input. For those, turn on the options below.

## Markdown body

There are two rendering paths, and they behave differently.

| Path | Raw HTML in markdown | `javascript:` links | Used by |
| --- | --- | --- | --- |
| `react-markdown` | shown as text | removed | `MarkdownRenderer` (`@yamblog/react`), `BlogPostPage` (`@yamblog/next`) |
| `toHtml()` default | **passed through** | **kept** | `BlogPostPage` (`@yamblog/astro`), your own `set:html` / `dangerouslySetInnerHTML` |
| `toHtml(md, { sanitize: true })` | removed | removed | anything that opts in |

### `toHtml` and `sanitize`

`toHtml` from `@yamblog/remark` passes raw HTML through by default, so existing
posts that use inline HTML keep rendering. For untrusted content pass
`sanitize: true`:

```ts
import { toHtml, remarkToc, remarkEmbed } from '@yamblog/remark';

const html = await toHtml(post.content, {
  remarkPlugins: [remarkEmbed, [remarkToc, { ids: true }]],
  sanitize: true,
});
```

With `sanitize: true`:

- raw HTML in the markdown is not passed through;
- after your `rehypePlugins` run, `script`, `style`, `iframe`, `object`, `embed`,
  `form`, `svg`, `math`, `link`, `meta`, `base` and similar elements are removed with
  their content, as are `on*`, `style` and `srcdoc` attributes;
- URLs are removed unless they are relative or use `http`, `https`, `mailto` or `tel`;
- the built-in `remarkEmbed` players (YouTube, Vimeo, CodePen) keep working. Custom
  embed providers that only return an HTML string are dropped, and so is
  `remarkInteractive` output unless you use `output: 'element'`.

It is a small built-in filter. If you need a configurable policy, keep
`sanitize: false` and add [`rehype-sanitize`](https://github.com/rehypejs/rehype-sanitize)
to `rehypePlugins` yourself. Its default schema removes iframes, so extend it if you
use `remarkEmbed`.

### Astro `BlogPostPage`

The Astro component renders with `toHtml`, so raw HTML passes through unless you
set its `sanitize` prop:

```astro
<BlogPostPage post={post} adjacent={adjacent} jsonLd={jsonLd} sanitize />
```

The prop needs a `@yamblog/remark` release that supports `sanitize`.

### react-markdown

`MarkdownRenderer` and the Next.js `BlogPostPage` are safe by default: raw HTML is
shown as text and dangerous URLs are removed. Adding `rehype-raw` turns raw HTML back
on, so only add it for trusted content, or pair it with `rehype-sanitize`. You do
**not** need `rehype-raw` for `remarkEmbed` (it emits real elements) or for
`remarkInteractive` with `output: 'element'`.

### `remarkInteractive`

By default every directive (`::name{…}`) becomes an element. For untrusted content,
limit it to the components you actually ship and emit elements instead of HTML
strings:

```ts
import remarkDirective from 'remark-directive';
import { toHtml, remarkInteractive } from '@yamblog/remark';

const html = await toHtml(post.content, {
  remarkPlugins: [
    remarkDirective,
    [remarkInteractive, { components: ['counter-demo'], output: 'element' }],
  ],
  sanitize: true,
});
```

`script`, `iframe`, `object`, `embed`, `style`, `link`, `meta` and `base` are never
converted in any mode (see `REFUSED_DIRECTIVE_NAMES`).

## JSON-LD and other `<script>` data

`JSON.stringify` does not escape `<`, so a title such as
`x</script><script>alert(1)</script>` closes a `<script type="application/ld+json">`
element and runs the rest as script. Never write `JSON.stringify(x)` into a script
tag directly.

- `@yamblog/next` `BlogPostPage` takes a `jsonLd` prop and escapes it for you.
- `@yamblog/astro` `BlogPostPage` escapes its `jsonLd` prop for you.
- For your own script tags, use `serializeJsonLd` from `@yamblog/core`. It is
  `JSON.stringify` with `<`, `>`, `&`, U+2028 and U+2029 written as `\uXXXX`, so
  the parsed JSON is identical:

```tsx
import { serializeJsonLd } from '@yamblog/core';

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
/>
```

```astro
<script type="application/ld+json" set:html={serializeJsonLd(jsonLd)} />
```

If your installed `@yamblog/core` does not export `serializeJsonLd` yet, use
`JSON.stringify(jsonLd).replace(/</g, '\\u003c')`.

## Front matter

Front matter is parsed as YAML (or JSON with `---json`). Executable front matter
(`---js`, `---javascript`, `---coffee`) is rejected with an error that names the
file, so a markdown file can never run code in your build or server. Front matter
values are validated against your Zod schema; invalid files fail the build.

Validated values are still author-controlled strings. Treat `coverImage`, `excerpt`
and custom URL fields as untrusted when posts are: render them through your
framework's normal escaping (JSX, Astro expressions), not as raw HTML.

## RSS, sitemap and llms.txt

The generators escape XML and strip characters XML 1.0 forbids, and `llms.txt`
escapes markdown link syntax. Make sure `siteUrl` is an absolute `https://` URL
(yamblog warns once when it is not); otherwise feeds contain relative links.

## Checklist for untrusted content

1. Render bodies with `react-markdown` (no `rehype-raw`) or `toHtml(…, { sanitize: true })`.
   In Astro, pass `sanitize` to `BlogPostPage`.
2. Pass JSON-LD through the `jsonLd` prop or `serializeJsonLd`.
3. Restrict `remarkInteractive` with `components` and `output: 'element'`.
4. Run `blog.validateContent()` in CI so a bad file fails the build, not production.
5. Review agent-written posts before merging them, the same way you review code.
