import { describe, it, expect, mock } from 'bun:test';
import { join } from 'path';
import { yamblogLoader } from '../src/loader';

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
    expect(typeof loader.schema).toBe('function');
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

  it('logs an error and does not throw on bad contentDir', async () => {
    const loader = yamblogLoader({ base: '/nonexistent/path' });
    const store = makeStore();
    const errorLogger = { ...logger, error: mock(() => {}) };
    await loader.load({ store, logger: errorLogger });
    expect(errorLogger.error).toHaveBeenCalled();
    expect(store.entries.length).toBe(0);
  });
});
