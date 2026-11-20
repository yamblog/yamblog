import { defineCollection } from 'astro:content';
import { yamblogLoader } from '@yamblog/astro';

// Optional: the same posts as an Astro content collection. The home page lists
// them with getCollection('blog'); the blog pages use the shared `blog`
// instance from src/lib/blog.ts. `base` is relative to the project root.
const blog = defineCollection({
  loader: yamblogLoader({ base: 'src/content/posts' }),
});

export const collections = { blog };
