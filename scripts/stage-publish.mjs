#!/usr/bin/env node
// Stages every publishable workspace package whose version is not on npm yet,
// using `npm stage publish` (npm staged publishing). A staged version is not
// installable until a maintainer approves it on npmjs.com or with
// `npm stage approve` (2FA required), so CI alone can never ship a release.
//
// Changesets has no staged mode yet (changesets/changesets#2025), which is why
// this replaces `changeset publish` in the release workflow.
//
// Usage:
//   node scripts/stage-publish.mjs            stage what is missing from npm
//   node scripts/stage-publish.mjs --list     only print what would be staged
//
// Zero dependencies; needs npm >= 11.15.0 for `npm stage`.

import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIN_NPM = [11, 15, 0];

/** Publishable packages under packages/, in dependency-friendly (core first) order. */
export function listPackages(root = ROOT) {
  const dir = join(root, 'packages');
  const packages = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(dir, entry.name, 'package.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.private === true || !manifest.name || !manifest.version) continue;
    packages.push({ name: manifest.name, version: manifest.version, dir: join(dir, entry.name), manifest });
  }
  return sortByDependencies(packages);
}

/** Orders packages so that each one comes after the workspace packages it depends on. */
export function sortByDependencies(packages) {
  const byName = new Map(packages.map((p) => [p.name, p]));
  const sorted = [];
  const seen = new Set();
  const visit = (pkg) => {
    if (seen.has(pkg.name)) return;
    seen.add(pkg.name);
    const deps = { ...pkg.manifest.dependencies, ...pkg.manifest.peerDependencies };
    for (const dep of Object.keys(deps).sort()) {
      if (byName.has(dep)) visit(byName.get(dep));
    }
    sorted.push(pkg);
  };
  for (const pkg of [...packages].sort((a, b) => a.name.localeCompare(b.name))) visit(pkg);
  return sorted;
}

export function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
  }
  return 0;
}

export function parseVersion(text) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(String(text).trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** True when the registry already serves name@version (i.e. it is published and approved). */
function isPublished(name, version) {
  const result = spawnSync('npm', ['view', `${name}@${version}`, 'version'], { encoding: 'utf8' });
  return result.status === 0 && result.stdout.trim() === version;
}

/** npm refuses to stage a version that is already staged; a re-run should not fail on that. */
export function isAlreadyStagedError(output) {
  return /already (been )?staged|already exists as a staged|staged version .*already exists/i.test(output);
}

function main() {
  const listOnly = process.argv.includes('--list');
  const packages = listPackages();

  const pending = packages.filter((p) => !isPublished(p.name, p.version));
  for (const p of packages) {
    console.log(`${pending.includes(p) ? 'to stage  ' : 'on npm    '} ${p.name}@${p.version}`);
  }
  if (listOnly) return 0;
  if (pending.length === 0) {
    console.log('Nothing to stage: every package version is already on npm.');
    return 0;
  }

  const npmVersion = parseVersion(execFileSync('npm', ['--version'], { encoding: 'utf8' }));
  if (!npmVersion || compareVersions(npmVersion, MIN_NPM) < 0) {
    console.error(`::error::npm ${npmVersion?.join('.') ?? 'unknown'} is too old for \`npm stage publish\` (need >= ${MIN_NPM.join('.')})`);
    return 1;
  }

  const failed = [];
  for (const p of pending) {
    if (!existsSync(join(p.dir, 'dist'))) {
      console.error(`::error::${p.name}: no dist/ folder; build the packages before staging`);
      failed.push(p);
      continue;
    }
    console.log(`\n::group::npm stage publish ${p.name}@${p.version}`);
    // --ignore-scripts: no lifecycle script may run in the job that holds the OIDC token.
    const result = spawnSync('npm', ['stage', 'publish', '--access', 'public', '--ignore-scripts'], {
      cwd: p.dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    process.stdout.write(output);
    console.log('::endgroup::');
    if (result.status === 0) {
      console.log(`staged ${p.name}@${p.version}`);
    } else if (isAlreadyStagedError(output)) {
      console.log(`::warning::${p.name}@${p.version} is already staged; leaving it as is`);
    } else {
      console.error(`::error::failed to stage ${p.name}@${p.version} (exit ${result.status})`);
      failed.push(p);
    }
  }

  if (failed.length > 0) {
    console.error(`\n${failed.length} package(s) failed to stage: ${failed.map((p) => p.name).join(', ')}`);
    return 1;
  }
  console.log(
    `\nStaged ${pending.length} package(s). They are NOT installable yet: approve each one on npmjs.com ` +
      '(package page -> staged versions) or with `npm stage list` / `npm stage approve <stage-id>`, ' +
      'then run the "Finalize release" workflow.',
  );
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main());
}
