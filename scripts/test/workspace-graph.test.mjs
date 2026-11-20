import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import {
  getWorkspaces,
  resolveRootDir,
  selectWorkspacesToBuild,
  shouldImpactAll,
} from '../workspace-graph.mjs';

const rootDir = resolveRootDir();
const buildable = getWorkspaces(rootDir).filter((workspace) => workspace.hasBuildScript);
const MISSING_SHA = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

describe('selectWorkspacesToBuild', () => {
  test('falls back to every workspace when the baseline ref is not in the clone', () => {
    const result = selectWorkspacesToBuild(rootDir, buildable, { since: MISSING_SHA });
    expect(result.reason).toBe('missing-ref');
    expect(result.selected.map((w) => w.name).sort()).toEqual(buildable.map((w) => w.name).sort());
  });

  test('--all selects every workspace', () => {
    const result = selectWorkspacesToBuild(rootDir, buildable, { all: true });
    expect(result.reason).toBe('all');
    expect(result.selected).toHaveLength(buildable.length);
  });

  test('an existing ref diffs normally', () => {
    const result = selectWorkspacesToBuild(rootDir, buildable, { since: 'HEAD' });
    expect(result.reason).toBe('changed');
  });
});

describe('shouldImpactAll', () => {
  test.each([
    'bun.lock',
    'bunfig.toml',
    'package.json',
    'tsconfig.base.json',
    'eslint.config.mjs',
    'scripts/build-changed.mjs',
    '.github/workflows/ci.yml',
  ])('%s rebuilds everything', (file) => {
    expect(shouldImpactAll([file])).toBe(true);
  });

  test('a package source change does not', () => {
    expect(shouldImpactAll(['packages/core/src/index.ts'])).toBe(false);
  });
});

describe('build-changed.mjs', () => {
  test('does not crash on a missing --since ref', () => {
    const result = spawnSync(
      process.execPath,
      [join(rootDir, 'scripts/build-changed.mjs'), '--since', MISSING_SHA, '--dry-run'],
      { cwd: rootDir, encoding: 'utf8' },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Building all workspaces');
    expect(result.stdout).toContain('> Building @yamblog/core');
  });

  test('--packages builds only packages/, core before its dependents', () => {
    const result = spawnSync(
      process.execPath,
      [join(rootDir, 'scripts/build-changed.mjs'), '--all', '--packages', '--dry-run'],
      { cwd: rootDir, encoding: 'utf8' },
    );
    expect(result.status).toBe(0);
    const built = [...result.stdout.matchAll(/> Building (\S+)/g)].map((m) => m[1]);
    expect(built.every((name) => name.startsWith('@yamblog/'))).toBe(true);
    expect(built.indexOf('@yamblog/core')).toBe(0);
    expect(built.indexOf('@yamblog/remark')).toBeLessThan(built.indexOf('@yamblog/astro'));
  });
});
