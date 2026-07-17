import { defineBlog, defaultSchema } from '@yamblog/core';
import { z } from 'zod';

export const blogSchema = defaultSchema.extend({
  authorWebpage: z.string().url().optional(),
});

// blog.getPosts() returns Post<typeof blogSchema>[] — authorWebpage is typed automatically
export const blog = defineBlog({
  contentDir: 'content/posts',
  // import.meta.env.SITE comes from the `site` option in astro.config.mjs
  siteUrl: import.meta.env.SITE,
  schema: blogSchema,
});
