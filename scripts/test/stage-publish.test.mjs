import { describe, expect, test } from 'bun:test';
import {
  compareVersions,
  isAlreadyStagedError,
  listPackages,
  parseVersion,
  sortByDependencies,
} from '../stage-publish.mjs';

describe('stage-publish', () => {
  test('lists the five publishable packages with core before its dependents', () => {
    const names = listPackages().map((p) => p.name);
    expect([...names].sort()).toEqual([
      '@yamblog/astro',
      '@yamblog/core',
      '@yamblog/next',
      '@yamblog/react',
      '@yamblog/remark',
    ]);
    for (const dependent of ['@yamblog/astro', '@yamblog/next', '@yamblog/react']) {
      expect(names.indexOf('@yamblog/core')).toBeLessThan(names.indexOf(dependent));
    }
    expect(names.indexOf('@yamblog/remark')).toBeLessThan(names.indexOf('@yamblog/astro'));
  });

  test('sortByDependencies puts dependencies first and skips nothing', () => {
    const pkg = (name, dependencies = {}) => ({ name, manifest: { dependencies } });
    const sorted = sortByDependencies([pkg('c', { b: '1' }), pkg('b', { a: '1' }), pkg('a'), pkg('d', { x: '1' })]);
    expect(sorted.map((p) => p.name)).toEqual(['a', 'b', 'c', 'd']);
  });

  test('version parsing and comparison', () => {
    expect(parseVersion('11.15.0\n')).toEqual([11, 15, 0]);
    expect(parseVersion('nope')).toBeNull();
    expect(compareVersions([11, 5, 2], [11, 15, 0])).toBeLessThan(0);
    expect(compareVersions([11, 15, 0], [11, 15, 0])).toBe(0);
    expect(compareVersions([12, 0, 0], [11, 15, 0])).toBeGreaterThan(0);
  });

  test('recognises an already-staged error but not other failures', () => {
    expect(isAlreadyStagedError('npm error version 1.2.0 already exists as a staged version')).toBe(true);
    expect(isAlreadyStagedError('npm error code ENEEDAUTH')).toBe(false);
    expect(isAlreadyStagedError('npm error code EOTP')).toBe(false);
  });
});
