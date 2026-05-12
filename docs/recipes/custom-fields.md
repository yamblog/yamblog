---
title: Custom Fields
description: Add and validate custom frontmatter fields using Zod schema extension.
---

# Custom Fields

Yamblog uses [Zod](https://zod.dev) for frontmatter validation. The default schema covers common fields (`title`, `date`, `author`, `tags`, etc.), but you can extend it with any fields your project needs.

## How it works

Pass a custom `schema` to `defineBlog`. It replaces the default schema entirely, so start by extending `defaultSchema` rather than rebuilding it from scratch.

```typescript
import { defineBlog, defaultSchema } from '@yamblog/core';
import { z } from 'zod';

const blogSchema = defaultSchema.extend({
  authorWebpage: z.string().url().optional(),
});

export const blog = defineBlog({
  contentDir: 'content/posts',
  schema: blogSchema,
});
```

Any post that sets `authorWebpage` in frontmatter will be validated as a URL. Posts without it pass validation because the field is optional.

## Validation types

### Optional string

```typescript
const blogSchema = defaultSchema.extend({
  authorWebpage: z.string().url().optional(),
  subtitle: z.string().optional(),
});
```

### Required string

```typescript
const blogSchema = defaultSchema.extend({
  // build will fail if this field is missing from any post
  canonical: z.string().url(),
});
```

### Enum

```typescript
const blogSchema = defaultSchema.extend({
  status: z.enum(['draft', 'review', 'published']).default('draft'),
});
```

### Regex-validated string

```typescript
const blogSchema = defaultSchema.extend({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'must be semver'),
});
```

### Array of strings

```typescript
const blogSchema = defaultSchema.extend({
  coAuthors: z.array(z.string()).default([]),
});
```

### Number with range constraint

```typescript
const blogSchema = defaultSchema.extend({
  difficulty: z.number().int().min(1).max(5).optional(),
});
```

## TypeScript types

`defineBlog` is generic — when you pass a custom schema, `blog.getPosts()` returns `Post<typeof yourSchema>[]` automatically. No manual type declarations or casts needed.

```typescript
const posts = await blog.getPosts();
posts[0].authorWebpage; // typed as string | undefined ✓
posts[0].nonExistent;   // TypeScript error ✓
```

## Full example — author webpage field

**`lib/blog.ts`**

```typescript
import { defineBlog, defaultSchema } from '@yamblog/core';
import { z } from 'zod';

export const blogSchema = defaultSchema.extend({
  authorWebpage: z.string().url().optional(),
});

export const blog = defineBlog({
  contentDir: 'content/posts',
  schema: blogSchema,
});
```

**`content/posts/my-post.md`**

```markdown
---
title: "My Post"
date: "2026-05-01"
author: "Ada Lovelace"
authorWebpage: "https://example.com/ada"
tags: []
draft: false
---

Post body here.
```

**`AuthorCard.astro`** (renders name + optional link)

```astro
---
interface Props {
  name: string;
  webpage?: string;
}
const { name, webpage } = Astro.props;
---

<div class="author-card">
  {webpage
    ? <a href={webpage} target="_blank" rel="noopener noreferrer">{name}</a>
    : <span>{name}</span>
  }
</div>
```

**`pages/blog/[slug].astro`**

```astro
---
import { blog } from '../../lib/blog';
import AuthorCard from '../../components/AuthorCard.astro';

export async function getStaticPaths() {
  const posts = await blog.getPosts();
  return posts.map(post => ({ params: { slug: post.slug }, props: { post } }));
}

// post is Post<typeof blogSchema> — authorWebpage is typed automatically
const { post } = Astro.props;
---

<AuthorCard name={post.author} webpage={post.authorWebpage} />
```

## Enforcing types at build time

TypeScript knows about your custom fields, but type errors are only caught if your build actually runs a type check. This varies by platform:

### Next.js
`next build` runs `tsc` — type errors in pages and components are caught automatically. No extra setup needed.

### Astro
Astro's bundler transpiles TypeScript but doesn't type-check `.astro` templates. Add `astro check` before `astro build`:

```json
"build": "astro check && astro build"
```

### React / Vite
Add `tsc --noEmit` before bundling:

```json
"build": "tsc --noEmit && vite build"
```

## Validation at build time

Run `blog.validateContent()` during your build step to catch missing required fields early:

```typescript
const posts = await blog.validateContent();
// throws if any post fails schema validation
```

This is especially useful in CI — add it as a pre-build check so broken frontmatter never reaches production.
