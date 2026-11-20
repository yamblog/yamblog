import { createRequire } from 'node:module';
import { join, resolve, sep } from 'node:path';
import { createBlog, defaultSchema } from '@yamblog/core';
import { z } from 'zod';
import { toLoaderSchema, toTypeScript } from './schema.js';

// System fields that yamblog adds to every post on top of the frontmatter schema
const systemFields = {
  id: z.string(),
  slug: z.string(),
  content: z.string(),
  readingTime: z.number(),
};

export type YamblogLoaderOptions = {
  /**
   * Directory containing the .md / .mdx files. An absolute path, or a path
   * relative to the process working directory (the Astro project root).
   */
  base: string;
  /** Glob pattern — reserved for future use; content is read from `base` */
  pattern?: string;
  /** Zod schema for frontmatter validation. Defaults to the core defaultSchema */
  schema?: z.ZodObject<z.ZodRawShape>;
  /**
   * Fail the Astro build when posts cannot be loaded (invalid frontmatter,
   * duplicate slugs, missing directory). The error is logged and rethrown.
   *
   * Default: `false` (log the error and keep whatever the content store
   * already held, as in 1.3). Set to `true` to fail the build instead. The
   * default will change to `true` in the next major release.
   */
  failOnError?: boolean;
};

// Minimal duck-typed interfaces so we don't need `astro` at compile time.
// Everything beyond `set`/`clear` is optional so older Astro versions (and
// hand-rolled test stores) keep working.
type AstroStoreEntry = {
  id: string;
  data: Record<string, unknown>;
  filePath?: string;
  digest?: string | number;
};

type AstroDataStore = {
  set(entry: AstroStoreEntry): unknown;
  clear(): void;
  keys?(): Iterable<string>;
  delete?(key: string): void;
};

type AstroLogger = {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
};

type AstroWatcher = {
  on(event: string, listener: (path: string) => void): unknown;
  off?(event: string, listener: (path: string) => void): unknown;
  removeListener?(event: string, listener: (path: string) => void): unknown;
  add?(paths: string | string[]): unknown;
};

type AstroLoaderContext = {
  store: AstroDataStore;
  logger: AstroLogger;
  /** Astro 5+: content digest helper. Unchanged entries are not rewritten when set. */
  generateDigest?(data: Record<string, unknown> | string): string;
  /** Astro 5+, dev only: file-system watcher. */
  watcher?: AstroWatcher;
};

/** Shape returned by `createSchema()` (Astro 6+ loader API). */
export type YamblogLoaderSchemaResult = {
  /**
   * A schema built with Astro's own zod (`astro/zod`). Typed `any` so it is
   * assignable to the zod type of whichever Astro version is installed.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
  /** TypeScript source exporting `Entry`, the type of each entry's data */
  types: string;
};

export type YamblogLoader = {
  name: string;
  load(context: AstroLoaderContext): Promise<void>;
  /**
   * Astro 5 schema hook (zod 3). Only present when the installed Astro is
   * older than 6, or when its version could not be detected: Astro 6+ warns
   * about function schemas and ignores them, and uses `createSchema` instead.
   */
  schema?: () => z.ZodObject<z.ZodRawShape>;
  /** Astro 6+ schema hook. Ignored by Astro 5. */
  createSchema: () => Promise<YamblogLoaderSchemaResult>;
};

/** @internal Overrides for tests. */
export type YamblogLoaderInternals = {
  /** Astro major version; `null` means "could not detect". Detected when omitted. */
  astroMajor?: number | null;
};

const EVENTS = ['add', 'change', 'unlink'] as const;
const MARKDOWN_FILE = /\.mdx?$/i;

/**
 * Detects the major version of the `astro` package that this loader runs
 * with, resolving it first from this package (the peer dependency) and then
 * from the project root. Returns `null` when it cannot be found.
 */
export function detectAstroMajor(): number | null {
  const bases = [import.meta.url, join(process.cwd(), 'package.json')];
  for (const base of bases) {
    try {
      const pkg = createRequire(base)('astro/package.json') as { version?: unknown };
      const major = Number.parseInt(String(pkg.version), 10);
      if (Number.isFinite(major)) return major;
    } catch {
      // try the next base
    }
  }
  return null;
}

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
export function yamblogLoader(options: YamblogLoaderOptions): YamblogLoader {
  return createYamblogLoader(options);
}

/** @internal Same as `yamblogLoader`, with test overrides. */
export function createYamblogLoader(
  options: YamblogLoaderOptions,
  internals: YamblogLoaderInternals = {},
): YamblogLoader {
  const failOnError = options.failOnError ?? false;
  const astroMajor = internals.astroMajor === undefined ? detectAstroMajor() : internals.astroMajor;

  // Derive from the frontmatter schema so custom fields are typed in Astro
  // too, and extend with the system fields yamblog adds per post.
  const fullSchema = () => (options.schema ?? defaultSchema).extend(systemFields);

  let watching: { watcher: AstroWatcher; handler: (path: string) => void } | undefined;
  let queue: Promise<void> = Promise.resolve();

  async function sync(context: AstroLoaderContext, rethrow: boolean, initial = false): Promise<void> {
    const { store, logger, generateDigest } = context;
    const blog = createBlog({
      contentDir: options.base,
      schema: options.schema,
    });

    let posts;
    try {
      posts = await blog.getPosts();
    } catch (err) {
      logger.error(`yamblogLoader: failed to load posts from "${options.base}": ${err}`);
      if (rethrow) throw err;
      if (initial && options.failOnError === undefined) {
        logger.warn(
          'yamblogLoader: continuing without these posts. Pass `failOnError: true` to fail the build instead; ' +
            'this will become the default in the next major version of @yamblog/astro.',
        );
      }
      return;
    }

    // Remove only entries whose post disappeared, so unchanged entries keep
    // their digest. Stores without keys()/delete() are cleared instead.
    const ids = new Set(posts.map((post) => post.slug));
    if (typeof store.keys === 'function' && typeof store.delete === 'function') {
      for (const key of Array.from(store.keys())) {
        if (!ids.has(key)) store.delete(key);
      }
    } else {
      store.clear();
    }

    for (const post of posts) {
      const data = post as unknown as Record<string, unknown>;
      const entry: AstroStoreEntry = { id: post.slug, data };
      if (typeof generateDigest === 'function') entry.digest = generateDigest(data);
      store.set(entry);
    }

    logger.info(`yamblogLoader: loaded ${posts.length} post${posts.length !== 1 ? 's' : ''} from "${options.base}"`);
  }

  function watch(context: AstroLoaderContext): void {
    const { watcher } = context;
    if (!watcher || typeof watcher.on !== 'function') return;

    // Drop a handler from an earlier load() so events don't fire twice.
    if (watching) {
      const prev = watching;
      for (const event of EVENTS) {
        if (typeof prev.watcher.off === 'function') prev.watcher.off(event, prev.handler);
        else if (typeof prev.watcher.removeListener === 'function') prev.watcher.removeListener(event, prev.handler);
      }
    }

    const dir = resolve(options.base);
    const handler = (path: string) => {
      if (typeof path !== 'string' || !MARKDOWN_FILE.test(path)) return;
      const abs = resolve(path);
      if (!abs.startsWith(dir + sep)) return;
      // Serialise reloads; in dev a bad post is logged, not thrown.
      queue = queue.then(() => sync(context, false)).catch((err) => {
        context.logger.error(`yamblogLoader: reload failed: ${err}`);
      });
    };

    if (typeof watcher.add === 'function') watcher.add(dir);
    for (const event of EVENTS) watcher.on(event, handler);
    watching = { watcher, handler };
  }

  const loader: YamblogLoader = {
    name: 'yamblog-loader',

    async createSchema() {
      // Astro 6+ validates loader schemas with its own zod (v4), so the
      // schema is rebuilt with `astro/zod`. The specifier is a variable so
      // TypeScript does not need astro's types at build time.
      const specifier = 'astro/zod';
      const mod = (await import(/* @vite-ignore */ specifier)) as { z?: unknown; default?: unknown };
      const astroZ = (mod.z ?? mod.default ?? mod) as Parameters<typeof toLoaderSchema>[1];
      const schema = fullSchema();
      return {
        schema: toLoaderSchema(schema, astroZ),
        types: `export type Entry = ${toTypeScript(schema)};\n`,
      };
    },

    async load(context: AstroLoaderContext) {
      await sync(context, failOnError, true);
      watch(context);
    },
  };

  // Astro 5 reads `schema()`; Astro 6+ warns about it and ignores it, so it
  // is only attached when Astro is older than 6 or its version is unknown.
  if (astroMajor === null || astroMajor < 6) {
    loader.schema = fullSchema;
  }

  return loader;
}
