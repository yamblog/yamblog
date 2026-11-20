import { describe, it, expect, mock } from 'bun:test';
import { join } from 'path';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { z } from 'zod';
import { z as z4 } from 'zod/v4';
import { yamblogLoader, createYamblogLoader, detectAstroMajor } from '../src/loader';

// Reuse the core test fixtures
const fixturesDir = join(import.meta.dir, '../../core/test/fixtures');

function makeStore() {
  const entries: Array<{ id: string; data: Record<string, unknown> }> = [];
  let cleared = false;
  return {
    set(entry: { id: string; data: Record<string, unknown> }) {
      entries.push(entry);
    },
    clear() {
      entries.length = 0;
      cleared = true;
    },
    entries,
    get cleared() { return cleared; },
  };
}

const logger = {
  info: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
};

describe('yamblogLoader', () => {
  it('returns a loader object with name and load function', () => {
    const loader = yamblogLoader({ base: fixturesDir });
    expect(loader.name).toBe('yamblog-loader');
    expect(typeof loader.load).toBe('function');
    expect(typeof loader.createSchema).toBe('function');
  });

  it('populates the store with published posts', async () => {
    const loader = yamblogLoader({ base: fixturesDir });
    const store = makeStore();
    await loader.load({ store, logger });
    // fixtures has 2 published posts (draft-post.md is filtered out)
    expect(store.entries.length).toBe(2);
  });

  it('clears the store before loading', async () => {
    const loader = yamblogLoader({ base: fixturesDir });
    const store = makeStore();
    await loader.load({ store, logger });
    expect(store.cleared).toBe(true);
  });

  it('uses post slug as the entry id', async () => {
    const loader = yamblogLoader({ base: fixturesDir });
    const store = makeStore();
    await loader.load({ store, logger });
    const ids = store.entries.map(e => e.id);
    expect(ids).toContain('hello-world');
  });

  it('entry data contains expected post fields', async () => {
    const loader = yamblogLoader({ base: fixturesDir });
    const store = makeStore();
    await loader.load({ store, logger });
    const entry = store.entries.find(e => e.id === 'hello-world');
    expect(entry).toBeDefined();
    expect(entry!.data.title).toBe('Hello World');
    expect(entry!.data.id).toBe('blog-hello-world');
    expect(typeof entry!.data.readingTime).toBe('number');
  });

  it('by default logs a bad contentDir, warns about the future default and keeps going', async () => {
    const loader = yamblogLoader({ base: '/nonexistent/path' });
    const store = makeStore();
    const errorLogger = { ...logger, error: mock(() => {}), warn: mock(() => {}) };
    await loader.load({ store, logger: errorLogger });
    expect(errorLogger.error).toHaveBeenCalled();
    expect(errorLogger.warn).toHaveBeenCalled();
    expect(store.entries.length).toBe(0);
  });

  it('failOnError: true logs and rethrows on bad contentDir so the build fails', async () => {
    const loader = yamblogLoader({ base: '/nonexistent/path', failOnError: true });
    const store = makeStore();
    const errorLogger = { ...logger, error: mock(() => {}) };
    await expect(loader.load({ store, logger: errorLogger })).rejects.toThrow('content directory not found');
    expect(errorLogger.error).toHaveBeenCalled();
    expect(store.entries.length).toBe(0);
  });

  it('failOnError: false keeps the old log-and-continue behaviour without the warning', async () => {
    const loader = yamblogLoader({ base: '/nonexistent/path', failOnError: false });
    const store = makeStore();
    const errorLogger = { ...logger, error: mock(() => {}), warn: mock(() => {}) };
    await loader.load({ store, logger: errorLogger });
    expect(errorLogger.error).toHaveBeenCalled();
    expect(errorLogger.warn).not.toHaveBeenCalled();
    expect(store.cleared).toBe(false);
    expect(store.entries.length).toBe(0);
  });

  it('failOnError: true rethrows invalid frontmatter instead of publishing an empty collection', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'yamblog-astro-'));
    try {
      writeFileSync(join(dir, 'bad.md'), '---\ntitle: Bad\ndate: not-a-date\n---\nbody\n');
      const loader = yamblogLoader({ base: dir, failOnError: true });
      const store = makeStore();
      await expect(loader.load({ store, logger: { ...logger, error: mock(() => {}) } })).rejects.toThrow();
      expect(store.cleared).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// A store with the Astro 5+ surface: keys/delete and digest-aware set.
function makeAstroStore() {
  const map = new Map<string, { id: string; data: Record<string, unknown>; digest?: string | number }>();
  const writes: string[] = [];
  return {
    map,
    writes,
    set(entry: { id: string; data: Record<string, unknown>; digest?: string | number }) {
      const existing = map.get(entry.id);
      if (entry.digest !== undefined && existing?.digest === entry.digest) return false;
      map.set(entry.id, entry);
      writes.push(entry.id);
      return true;
    },
    clear: mock(() => map.clear()),
    keys: () => map.keys(),
    delete: (key: string) => { map.delete(key); },
  };
}

const digest = (data: Record<string, unknown> | string) =>
  typeof data === 'string' ? data : JSON.stringify(data);

describe('yamblogLoader incremental updates', () => {
  it('sets a digest on every entry and skips unchanged entries on reload', async () => {
    const loader = yamblogLoader({ base: fixturesDir });
    const store = makeAstroStore();
    await loader.load({ store, logger, generateDigest: digest });
    expect(store.writes.length).toBe(2);
    for (const entry of store.map.values()) expect(typeof entry.digest).toBe('string');

    store.writes.length = 0;
    await loader.load({ store, logger, generateDigest: digest });
    expect(store.writes).toEqual([]);
    expect(store.clear).not.toHaveBeenCalled();
    expect(store.map.size).toBe(2);
  });

  it('deletes only entries whose post disappeared', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'yamblog-astro-'));
    try {
      const post = (title: string) => `---\ntitle: ${title}\ndate: 2024-01-15\n---\nbody\n`;
      writeFileSync(join(dir, 'a.md'), post('A'));
      writeFileSync(join(dir, 'b.md'), post('B'));
      const loader = yamblogLoader({ base: dir });
      const store = makeAstroStore();
      await loader.load({ store, logger, generateDigest: digest });
      expect([...store.map.keys()].sort()).toEqual(['a', 'b']);

      rmSync(join(dir, 'b.md'));
      writeFileSync(join(dir, 'a.md'), post('A2'));
      store.writes.length = 0;
      await loader.load({ store, logger, generateDigest: digest });
      expect([...store.map.keys()]).toEqual(['a']);
      expect(store.writes).toEqual(['a']);
      expect(store.map.get('a')!.data.title).toBe('A2');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('yamblogLoader dev watcher', () => {
  function makeWatcher() {
    const listeners = new Map<string, Set<(path: string) => void>>();
    return {
      listeners,
      added: [] as string[],
      on(event: string, fn: (path: string) => void) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(fn);
      },
      off(event: string, fn: (path: string) => void) { listeners.get(event)?.delete(fn); },
      add(path: string | string[]) { this.added.push(...([] as string[]).concat(path)); },
      emit(event: string, path: string) { for (const fn of listeners.get(event) ?? []) fn(path); },
    };
  }

  it('reloads when a markdown file under base changes, once per event', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'yamblog-astro-'));
    try {
      const post = (title: string) => `---\ntitle: ${title}\ndate: 2024-01-15\n---\nbody\n`;
      writeFileSync(join(dir, 'a.md'), post('A'));
      const loader = yamblogLoader({ base: dir });
      const store = makeAstroStore();
      const watcher = makeWatcher();
      const ctx = { store, logger, generateDigest: digest, watcher };
      await loader.load(ctx);
      // A second load (e.g. a config resync) must not double-register.
      await loader.load(ctx);
      expect(watcher.listeners.get('change')!.size).toBe(1);
      expect(watcher.added).toContain(dir);

      writeFileSync(join(dir, 'b.md'), post('B'));
      watcher.emit('add', join(dir, 'b.md'));
      watcher.emit('change', join(dir, 'unrelated.txt'));
      watcher.emit('change', join(tmpdir(), 'elsewhere.md'));
      await new Promise((r) => setTimeout(r, 20));
      expect([...store.map.keys()].sort()).toEqual(['a', 'b']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('logs (does not throw) when a watched reload hits a bad post', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'yamblog-astro-'));
    try {
      writeFileSync(join(dir, 'a.md'), '---\ntitle: A\ndate: 2024-01-15\n---\nbody\n');
      const loader = yamblogLoader({ base: dir });
      const store = makeAstroStore();
      const watcher = makeWatcher();
      const errorLogger = { ...logger, error: mock(() => {}) };
      await loader.load({ store, logger: errorLogger, generateDigest: digest, watcher });
      writeFileSync(join(dir, 'a.md'), '---\ntitle: A\ndate: nope\n---\nbody\n');
      watcher.emit('change', join(dir, 'a.md'));
      await new Promise((r) => setTimeout(r, 20));
      expect(errorLogger.error).toHaveBeenCalled();
      expect(store.map.get('a')!.data.title).toBe('A');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('works without a watcher (build / older Astro)', async () => {
    const loader = yamblogLoader({ base: fixturesDir });
    await loader.load({ store: makeStore(), logger });
  });
});

describe('yamblogLoader schema', () => {
  it('detects the installed Astro major version', () => {
    const major = detectAstroMajor();
    expect(typeof major).toBe('number');
  });

  it('keeps the schema() function for Astro 5', () => {
    const loader = createYamblogLoader({ base: fixturesDir }, { astroMajor: 5 });
    expect(typeof loader.schema).toBe('function');
    const shape = loader.schema!().shape;
    expect(Object.keys(shape)).toEqual(expect.arrayContaining(['title', 'date', 'slug', 'readingTime']));
  });

  it('keeps the schema() function when the Astro version is unknown', () => {
    const loader = createYamblogLoader({ base: fixturesDir }, { astroMajor: null });
    expect(typeof loader.schema).toBe('function');
  });

  it('omits the function schema on Astro 6+ (which warns and ignores it)', () => {
    for (const astroMajor of [6, 7]) {
      const loader = createYamblogLoader({ base: fixturesDir }, { astroMajor });
      expect('schema' in loader).toBe(false);
      expect(typeof loader.createSchema).toBe('function');
    }
  });

  it('createSchema returns an Astro-zod (v4) schema and entry types', async () => {
    const loader = yamblogLoader({ base: fixturesDir });
    const { schema, types } = await loader.createSchema();
    // Astro 6+ only accepts zod 4 schemas (they carry `_zod`)
    expect(schema && typeof schema === 'object' && '_zod' in schema).toBe(true);
    const parsed = (schema as z4.ZodType).parse({
      title: 'T', date: '2024-01-15', id: 'blog-t', slug: 't', content: '', readingTime: 1,
    }) as Record<string, unknown>;
    expect(parsed.date).toBeInstanceOf(Date);
    expect(parsed.tags).toEqual([]);
    expect(parsed.author).toBe('Anonymous');
    expect(types).toContain('export type Entry = {');
    expect(types).toContain('title: string');
    expect(types).toContain('date: Date');
    expect(types).toContain('excerpt?: string | undefined');
    expect(types).toContain('tags: Array<string>');
    expect(types).toContain('readingTime: number');
  });

  it('createSchema maps custom frontmatter schemas', async () => {
    const schema = z.object({
      title: z.string(),
      date: z.coerce.date(),
      status: z.enum(['a', 'b']),
      score: z.number().nullable().optional(),
      'kebab-key': z.string().default('x'),
      meta: z.record(z.string()).optional(),
      shout: z.string().transform((s) => s.length),
    });
    const loader = yamblogLoader({ base: fixturesDir, schema });
    const { types } = await loader.createSchema();
    expect(types).toContain('status: "a" | "b"');
    expect(types).toContain('score?: number | null | undefined');
    expect(types).toContain('"kebab-key": string');
    expect(types).toContain('meta?: Record<string, string> | undefined');
    expect(types).toContain('shout: unknown');
    expect(types).toContain('slug: string');
  });
});
