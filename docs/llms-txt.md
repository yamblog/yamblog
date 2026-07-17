---
title: llms.txt
description: Generate the blog section of your llms.txt file and serve it from Next.js or Astro.
---

# llms.txt

[llms.txt](https://llmstxt.org) is a proposed standard for helping large language models understand your website. Similar to `robots.txt`, it's a plain text file at `yourdomain.com/llms.txt` that describes what your site is and what's on it — structured as markdown so LLMs can easily parse and reason about it.

Yamblog generates the **blog section** of your `llms.txt`. You compose the full file — the package owns the blog-specific part, you own the rest.

## Generate the blog section

```ts
const section = await blog.generateLlmsTxt();
```

By default, only posts with `featured: true` in their frontmatter are included.

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `sectionTitle` | `string` | `'Blog'` | The `##` heading for the section |
| `siteUrl` | `string` | from config | Override the base URL |
| `basePath` | `string` | from config (`'/blog'`) | URL prefix for post links |
| `filter` | `(post: Post) => boolean` | `p => p.featured` | Which posts to include |
| `includeDrafts` | `boolean` | `false` | Include `draft: true` posts. Off even when the blog is configured with `includeDrafts: true`, so previews can't publish drafts. Applied before `filter` |

### Filtering examples

```ts
// All posts
await blog.generateLlmsTxt({ filter: () => true });

// Posts tagged 'ai'
await blog.generateLlmsTxt({ filter: p => p.tags.includes('ai') });

// Posts in a specific category
await blog.generateLlmsTxt({ filter: p => p.category === 'tutorials' });
```

## Compose the full file

Yamblog generates the blog section. You write the rest — it's a template string:

```ts
const section = await blog.generateLlmsTxt();

const llmsTxt = `# Acme Corp

> We help developers ship software faster.

We build tools for modern engineering teams. Our blog covers TypeScript, AI, and developer experience.

${section}

## Docs

- [Getting Started](https://acme.com/docs/getting-started): Set up your first project.
- [API Reference](https://acme.com/docs/api): Full API documentation.
`;
```

The full spec for the format is at [llmstxt.org](https://llmstxt.org). The required fields are a `# Name` heading and an `>` blockquote description — everything else is optional.

## Serve it

### Next.js (App Router)

Create `app/llms.txt/route.ts`:

```ts
import { blog } from '@/lib/blog';

export async function GET() {
  const section = await blog.generateLlmsTxt();
  const body = `# My Site\n\n> Short description of what this site is.\n\n${section}`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

The file is served at `yourdomain.com/llms.txt` automatically.

### Astro

Create `src/pages/llms.txt.ts`:

```ts
import type { APIRoute } from 'astro';
import { blog } from '../lib/blog';

export const GET: APIRoute = async () => {
  const section = await blog.generateLlmsTxt();
  const body = `# My Site\n\n> Short description of what this site is.\n\n${section}`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
```

The file is served at `yourdomain.com/llms.txt` automatically.
