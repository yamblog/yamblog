import { defineCollection } from 'astro:content';
import { yamblogLoader } from '@yamblog/astro';

const blog = defineCollection({
  loader: yamblogLoader({
    base: new URL('./content/posts', import.meta.url).pathname,
  }),
});

export const collections = { blog };
