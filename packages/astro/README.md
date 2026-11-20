# @yamblog/astro

Astro adapter for `@yamblog/core`. Pre-built `.astro` components and an optional Content Layer loader.

## Install

```bash
npm install @yamblog/core @yamblog/astro @yamblog/remark
```

## Setup

### 1. Shared blog instance

Create one instance and import it from every page. Posts are cached after the first
read, so all pages share one filesystem pass.

```ts
// src/lib/blog.ts
import { defineBlog } from '@yamblog/core';

// The content dir is resolved against the project root (process.cwd()).
export const blog = defineBlog('src/content/posts', import.meta.env.SITE);
```

Avoid `new URL('../content/posts', import.meta.url).pathname` in pages: in a production
build `import.meta.url` points at the bundled chunk, and `.pathname` breaks on paths with
spaces and on Windows.

### 2. Blog listing page

```astro
---
// src/pages/blog/index.astro
import BlogListPage from '@yamblog/astro/components/BlogListPage.astro';
import { blog } from '../../lib/blog';

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
import { blog } from '../../lib/blog';

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
import { toHtml, remarkToc } from '@yamblog/remark';

const html = await toHtml(post.content, { remarkPlugins: [[remarkToc, { ids: true }]] });
---
<article class="prose" set:html={html} />
```

### Optional: Content Layer collection

If you prefer `getCollection()` over the blog instance, register the loader as a collection.
This is an alternative to steps 1-3, not a requirement for them. The loader needs the
Content Layer API, so it requires Astro 5 or later (the package's `astro` peer range is wider
because the components and the blog-instance setup above do not use the loader).

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { yamblogLoader } from '@yamblog/astro';

const blog = defineCollection({
  loader: yamblogLoader({ base: 'src/content/posts' }),
});

export const collections = { blog };
```

```astro
---
import { getCollection } from 'astro:content';
const posts = (await getCollection('blog')).map(entry => entry.data);
---
```

The loader:

- Logs an error when posts cannot be loaded (invalid frontmatter, duplicate slugs,
  missing directory) and keeps going. Pass `failOnError: true` to fail the build instead;
  this becomes the default in the next major version.
- Sets a digest on each entry, so unchanged posts are not rewritten on reload, and removes
  entries whose file was deleted.
- Reloads in `astro dev` when a `.md`/`.mdx` file under `base` is added, changed or removed.
- Provides entry types via `createSchema()` on Astro 6+, and via `schema()` on Astro 5.

## Security: trusted vs untrusted content

- **Markdown body.** `BlogPostPage` renders markdown with `toHtml()` and injects the result
  with `set:html`. By default raw HTML in markdown is passed through as-is (the same as
  Astro's own markdown pipeline), which is right for posts you write yourself. If post
  content can come from anyone else (a CMS, user submissions, AI-written posts), pass
  `sanitize`: raw HTML is dropped and dangerous URLs/attributes are removed, while yamblog
  embeds keep working.

  ```astro
  <BlogPostPage post={post} sanitize />
  ```

  Doing your own rendering? Pass the same option: `toHtml(post.content, { sanitize: true })`.

- **JSON-LD.** The `jsonLd` prop is serialised with `<`, `>`, `&`, U+2028 and U+2029 escaped,
  so a frontmatter value such as `</script>` cannot close the script element. If you write
  your own `<script type="application/ld+json">`, escape it the same way:

  ```astro
  <script
    type="application/ld+json"
    set:html={JSON.stringify(jsonLd).replace(/[<>&\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))}
  />
  ```

## Dates

The components format `post.date` in UTC. Date-only frontmatter (`date: 2024-01-15`) is
parsed as UTC midnight, so the displayed day no longer depends on the build machine's
timezone.

## API

| Export | Description |
|--------|-------------|
| `yamblogLoader(options)` | Astro Content Layer loader — reads `.md`/`.mdx` files into the collection store |
| `BlogListPage.astro` | Listing component with search form, tag badges, reading time |
| `BlogPostPage.astro` | Post detail with adjacent nav and optional JSON-LD injection |

### `yamblogLoader` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `base` | `string` | required | Posts directory: absolute, or relative to the project root (`process.cwd()`) |
| `pattern` | `string?` | — | Reserved for future glob support |
| `schema` | `ZodObject?` | core schema | Custom frontmatter Zod schema. System fields (`id`, `slug`, `content`, `readingTime`) are added automatically |
| `failOnError` | `boolean?` | `false` | `true` rethrows load errors so the build fails. `false` logs them and keeps the previous store contents. The default becomes `true` in the next major |

### `BlogPostPage` props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `post` | `Post` | required | Post data from `@yamblog/core` |
| `adjacent` | `AdjacentPosts?` | — | Previous/next post links |
| `basePath` | `string` | `"/blog"` | Base path for back link and adjacent links |
| `jsonLd` | `object?` | — | JSON-LD structured data injected as an escaped `<script type="application/ld+json">` |
| `sanitize` | `boolean?` | `false` | Sanitise the rendered markdown (drop raw HTML, strip dangerous URLs/attributes). Turn on for untrusted content |

### `BlogListPage` props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `posts` | `Post[]` | required | Posts to list |
| `query` | `string?` | — | Current search query, shown in the search box |
| `basePath` | `string` | `"/blog"` | Base path for post links |
| `title` | `string` | `"Blog"` | Page heading |

> Need a custom markdown pipeline (plugins, rehype transforms)? Use `toHtml()` from `@yamblog/remark` directly and render the result in your own component.
