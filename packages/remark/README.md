# @yamblog/remark

Remark plugins and markdown-to-HTML conversion for `@yamblog`.

## Install

```bash
npm install @yamblog/remark
```

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
  remarkPlugins: [remarkToc, remarkEmbed],
});
```

### With plugin options

```ts
import { toHtml, remarkToc } from '@yamblog/remark';

const html = await toHtml(post.content, {
  remarkPlugins: [[remarkToc, { heading: 'Contents', maxDepth: 4 }]],
});
```

### API

```ts
toHtml(markdown: string, options?: ToHtmlOptions): Promise<string>

type ToHtmlOptions = {
  remarkPlugins?: PluggableList; // inserted before remark-rehype
  rehypePlugins?: PluggableList; // inserted before rehype-stringify
};
```

### With `@yamblog/astro` (BlogPostPage)

```astro
---
import BlogPostPage from '@yamblog/astro/components/BlogPostPage.astro';
import { remarkToc } from '@yamblog/remark';
---
<BlogPostPage post={post} remarkPlugins={[remarkToc]} />
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

The plugin replaces the `## Table of Contents` heading with:

```markdown
- [Introduction](#introduction)
- [Usage](#usage)
  - [Basic](#basic)
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `heading` | `string` | `"Table of Contents"` | Placeholder heading text to replace |
| `minDepth` | `number` | `2` | Shallowest heading level to include |
| `maxDepth` | `number` | `3` | Deepest heading level to include |

```ts
remark().use(remarkToc, {
  heading: 'Contents',
  maxDepth: 4,
})
```

---

## `remarkInteractive` — directives to React components

Transforms `::component-name{prop=val}` directive syntax into self-closing HTML elements that ReactMarkdown renders via its `components` prop.

**Requires `remark-directive` before it in the plugin pipeline.**

### Usage

```tsx
import ReactMarkdown from 'react-markdown';
import remarkDirective from 'remark-directive';
import rehypeRaw from 'rehype-raw';
import { remarkInteractive } from '@yamblog/remark';

<ReactMarkdown
  remarkPlugins={[remarkDirective, remarkInteractive]}
  rehypePlugins={[rehypeRaw]}
  components={{ 'counter-demo': CounterDemo }}
>
  {post.content}
</ReactMarkdown>
```

### Markdown syntax

```markdown
::counter-demo{start=0 step=1}

::alert{type=warning message="Something happened"}
```

Renders as `<counter-demo start="0" step="1" />` and `<alert type="warning" message="Something happened" />`.

---

## `remarkEmbed` — oEmbed URL transforms

Converts bare URLs on their own line into iframes. Supports YouTube, Vimeo, and CodePen out of the box.

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

### Custom providers

```ts
remark().use(remarkEmbed, {
  providers: [
    {
      name: 'my-service',
      pattern: /my-service\.com\/embed\/(\d+)/,
      html: ([, id]) => `<iframe src="https://my-service.com/embed/${id}"></iframe>`,
    },
  ],
})
```
