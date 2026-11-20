import { describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveContentDirs } from '../validate-content.ts';

describe('resolveContentDirs', () => {
  test('throws on a missing content directory instead of skipping it', () => {
    const root = mkdtempSync(join(tmpdir(), 'yamblog-validate-'));
    mkdirSync(join(root, 'present'));
    expect(() => resolveContentDirs(root, ['present', 'gone/posts'])).toThrow('gone/posts');
  });

  test('resolves directories that exist', () => {
    const root = mkdtempSync(join(tmpdir(), 'yamblog-validate-'));
    mkdirSync(join(root, 'a'));
    expect(resolveContentDirs(root, ['a'])).toEqual([join(root, 'a')]);
  });
});
