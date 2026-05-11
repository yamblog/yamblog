# @yamblog/astro

Astro adapter for `@yamblog/core`. Content Layer loader and pre-built `.astro` components.

## Install

```bash
npm install @yamblog/core @yamblog/astro @yamblog/remark
```

## Setup

### 1. Define your collection

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { yamblogLoader } from '@yamblog/astro';

const blog = defineCollection({
  loader: yamblogLoader({ base: './src/content/posts' }),
});

export const collections = { blog };
```

### 2. Blog listing page

```astro
---
// src/pages/blog/index.astro
import BlogListPage from '@yamblog/astro/components/BlogListPage.astro';
import { createBlog } from '@yamblog/core';

const blog = createBlog({ contentDir: new URL('../content/posts', import.meta.url).pathname });
const query = Astro.url.searchParams.get('q') ?? undefined;
const posts = query ? await blog.search(query) : await blog.getPosts();
---
<BlogListPage posts={posts} query={query} />
```

### 3. Post detail page

```astro
---
// src/pages/blog/[slug].astro
import BlogPostPage from '@yamblog/astro/components/BlogPostPage.astro';
import { createBlog } from '@yamblog/core';

const blog = createBlog({ contentDir: new URL('../content/posts', import.meta.url).pathname });

export async function getStaticPaths() {
  const posts = await blog.getPosts();
  return posts.map(post => ({ params: { slug: post.slug } }));
}

const post     = await blog.getPostBySlug(Astro.params.slug!);
const adjacent = await blog.getAdjacentPosts(Astro.params.slug!);
---
<BlogPostPage post={post} adjacent={adjacent} />
```

#### Custom pipeline (skip the pre-built component)

```astro
---
import { toHtml } from '@yamblog/remark';

const html = await toHtml(post.content, { remarkPlugins: [remarkToc] });
---
<article class="prose" set:html={html} />
```

## API

| Export | Description |
|--------|-------------|
| `yamblogLoader(options)` | Astro Content Layer loader — reads `.md`/`.mdx` files into the collection store |
| `BlogListPage.astro` | Listing component with search form, tag badges, reading time |
| `BlogPostPage.astro` | Post detail with adjacent nav and optional JSON-LD injection |

### `yamblogLoader` options

| Option | Type | Description |
|--------|------|-------------|
| `base` | `string` | Absolute path to the posts directory |
| `pattern` | `string?` | Reserved for future glob support |
| `schema` | `ZodObject?` | Custom Zod schema (defaults to core schema) |

### `BlogPostPage` props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `post` | `Post` | required | Post data from `@yamblog/core` |
| `adjacent` | `AdjacentPosts?` | — | Previous/next post links |
| `basePath` | `string` | `"/blog"` | Base path for back link and adjacent links |
| `jsonLd` | `object?` | — | JSON-LD structured data injected as `<script type="application/ld+json">` |

> Need a custom markdown pipeline (plugins, rehype transforms)? Use `toHtml()` from `@yamblog/remark` directly and render the result in your own component.
