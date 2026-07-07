import { createBlog, defaultSchema } from '@yamblog/core';
import { z } from 'zod';

// System fields that yamblog adds to every post on top of the frontmatter schema
const systemFields = {
  id: z.string(),
  slug: z.string(),
  content: z.string(),
  readingTime: z.number(),
};

export type YamblogLoaderOptions = {
  /** Absolute path to the directory containing .md / .mdx files */
  base: string;
  /** Glob pattern — reserved for future use; content is read from `base` */
  pattern?: string;
  /** Zod schema for frontmatter validation. Defaults to the core defaultSchema */
  schema?: z.ZodObject<z.ZodRawShape>;
};

// Minimal duck-typed interfaces so we don't need `astro` at compile time
type AstroDataStore = {
  set: (entry: { id: string; data: Record<string, unknown>; filePath?: string }) => void;
  clear: () => void;
};

type AstroLogger = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
};

type AstroLoaderContext = {
  store: AstroDataStore;
  logger: AstroLogger;
};

/**
 * Astro Content Layer loader for yamblog.
 *
 * @example
 * // src/content.config.ts
 * import { defineCollection } from 'astro:content';
 * import { yamblogLoader } from '@yamblog/astro';
 *
 * const blog = defineCollection({
 *   loader: yamblogLoader({ base: './src/content/posts' }),
 * });
 * export const collections = { blog };
 */
export function yamblogLoader(options: YamblogLoaderOptions) {
  return {
    name: 'yamblog-loader',

    schema() {
      // Derive from the frontmatter schema so custom fields are typed in
      // Astro too, and extend with the system fields yamblog adds per post.
      return (options.schema ?? defaultSchema).extend(systemFields);
    },

    async load({ store, logger }: AstroLoaderContext) {
      const blog = createBlog({
        contentDir: options.base,
        schema: options.schema,
      });

      let posts;
      try {
        posts = await blog.getPosts();
      } catch (err) {
        logger.error(`yamblogLoader: failed to load posts from "${options.base}": ${err}`);
        return;
      }

      store.clear();
      for (const post of posts) {
        store.set({
          id: post.slug,
          data: post as unknown as Record<string, unknown>,
        });
      }

      logger.info(`yamblogLoader: loaded ${posts.length} post${posts.length !== 1 ? 's' : ''} from "${options.base}"`);
    },
  };
}
