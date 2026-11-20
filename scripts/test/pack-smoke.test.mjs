import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkPackedFiles, loadableSpecifiers } from '../pack-smoke.mjs';

function fakePackage(files) {
  const dir = mkdtempSync(join(tmpdir(), 'yamblog-pack-'));
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(dir, file, '..'), { recursive: true });
    writeFileSync(join(dir, file), content);
  }
  return dir;
}

describe('loadableSpecifiers', () => {
  test('lists JS subpaths and skips package.json and .astro files', () => {
    expect(
      loadableSpecifiers('@yamblog/x', {
        '.': { types: './dist/index.d.ts', import: './dist/index.js' },
        './sub': './dist/sub.js',
        './C.astro': './src/C.astro',
        './package.json': './package.json',
      }),
    ).toEqual(['@yamblog/x', '@yamblog/x/sub']);
  });
});

describe('checkPackedFiles', () => {
  const pkg = { exports: { '.': { import: './dist/index.js' } } };

  test('passes a clean package', () => {
    const dir = fakePackage({ 'package.json': '{}', 'dist/index.js': 'export {}' });
    expect(checkPackedFiles('@yamblog/next', pkg, dir)).toEqual([]);
  });

  test('flags a missing exports target', () => {
    const dir = fakePackage({ 'package.json': '{}' });
    expect(checkPackedFiles('@yamblog/core', pkg, dir)[0]).toContain('not in the tarball');
  });

  test('flags bundled React and node_modules code in @yamblog/next', () => {
    const dir = fakePackage({
      'package.json': '{}',
      'dist/index.js': '// node_modules/react/cjs/react.development.js',
    });
    const problems = checkPackedFiles('@yamblog/next', pkg, dir);
    expect(problems.some((p) => p.includes('react.development'))).toBe(true);
    expect(problems.some((p) => p.includes('node_modules/'))).toBe(true);
  });

  test('flags node_modules directories inside a tarball', () => {
    const dir = fakePackage({ 'package.json': '{}', 'dist/index.js': '', 'node_modules/x/index.js': '' });
    expect(checkPackedFiles('@yamblog/core', pkg, dir).some((p) => p.includes('tarball contains'))).toBe(true);
  });
});
