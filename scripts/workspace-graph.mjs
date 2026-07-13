import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT_FILES_THAT_IMPACT_ALL = new Set([
  'bun.lock',
  'package.json',
  'tsconfig.base.json',
]);

const ROOT_PREFIXES_THAT_IMPACT_ALL = ['scripts/'];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function expandWorkspacePattern(rootDir, pattern) {
  if (!pattern.includes('*')) {
    const candidate = join(rootDir, pattern);
    return existsSync(join(candidate, 'package.json')) ? [candidate] : [];
  }

  const prefix = pattern.slice(0, pattern.indexOf('*')).replace(/\/$/, '');
  const baseDir = join(rootDir, prefix);

  return readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(baseDir, entry.name))
    .filter((dir) => existsSync(join(dir, 'package.json')));
}

export function getWorkspaces(rootDir) {
  const rootPackageJson = readJson(join(rootDir, 'package.json'));
  const workspaceDirs = rootPackageJson.workspaces.flatMap((pattern) =>
    expandWorkspacePattern(rootDir, pattern),
  );

  const workspaces = workspaceDirs.map((dir) => {
    const packageJson = readJson(join(dir, 'package.json'));
    const combinedDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
    };

    return {
      dir,
      relDir: relative(rootDir, dir).replace(/\\/g, '/'),
      name: packageJson.name,
      private: packageJson.private === true,
      hasBuildScript: typeof packageJson.scripts?.build === 'string',
      dependencies: Object.keys(combinedDeps),
    };
  });

  const workspaceNames = new Set(workspaces.map((workspace) => workspace.name));

  for (const workspace of workspaces) {
    workspace.internalDependencies = workspace.dependencies.filter((dep) =>
      workspaceNames.has(dep),
    );
  }

  return workspaces;
}

export function getWorkspaceMaps(workspaces) {
  const byName = new Map(workspaces.map((workspace) => [workspace.name, workspace]));
  const dependents = new Map(workspaces.map((workspace) => [workspace.name, new Set()]));

  for (const workspace of workspaces) {
    for (const dependency of workspace.internalDependencies) {
      // When called with a subset (e.g. sortWorkspacesTopologically over the
      // affected workspaces), a dependency may fall outside the subset.
      dependents.get(dependency)?.add(workspace.name);
    }
  }

  return { byName, dependents };
}

function git(args, rootDir) {
  return execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function refExists(rootDir, ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', ref], rootDir);
    return true;
  } catch {
    return false;
  }
}

export function resolveDefaultSinceRef(rootDir) {
  const githubBefore = process.env.GITHUB_EVENT_BEFORE;
  if (githubBefore && !/^0+$/.test(githubBefore)) {
    return githubBefore;
  }

  const githubBaseRef = process.env.GITHUB_BASE_REF;
  if (githubBaseRef && refExists(rootDir, `origin/${githubBaseRef}`)) {
    return `origin/${githubBaseRef}`;
  }

  if (refExists(rootDir, 'origin/main')) {
    return 'origin/main';
  }

  if (refExists(rootDir, 'HEAD~1')) {
    return 'HEAD~1';
  }

  return null;
}

export function getChangedFiles(rootDir, sinceRef, headRef = 'HEAD') {
  if (!sinceRef) {
    return [];
  }

  const mergeBase = git(['merge-base', sinceRef, headRef], rootDir);
  const committedOutput = git(['diff', '--name-only', `${mergeBase}..${headRef}`], rootDir);
  const changedFiles = new Set(
    committedOutput ? committedOutput.split('\n').filter(Boolean) : [],
  );

  if (headRef === 'HEAD') {
    const stagedOutput = git(['diff', '--name-only', '--cached'], rootDir);
    const unstagedOutput = git(['diff', '--name-only'], rootDir);

    for (const output of [stagedOutput, unstagedOutput]) {
      for (const file of output ? output.split('\n').filter(Boolean) : []) {
        changedFiles.add(file);
      }
    }
  }

  return [...changedFiles];
}

export function shouldImpactAll(changedFiles) {
  return changedFiles.some(
    (file) =>
      ROOT_FILES_THAT_IMPACT_ALL.has(file) ||
      ROOT_PREFIXES_THAT_IMPACT_ALL.some((prefix) => file.startsWith(prefix)),
  );
}

export function collectAffectedWorkspaces(workspaces, changedFiles) {
  const { byName, dependents } = getWorkspaceMaps(workspaces);

  if (shouldImpactAll(changedFiles)) {
    return workspaces.filter((workspace) => workspace.hasBuildScript);
  }

  const directlyChanged = new Set();

  for (const changedFile of changedFiles) {
    const workspace = workspaces.find(
      (candidate) =>
        changedFile === candidate.relDir || changedFile.startsWith(`${candidate.relDir}/`),
    );

    if (workspace) {
      directlyChanged.add(workspace.name);
    }
  }

  const affected = new Set(directlyChanged);
  const queue = [...directlyChanged];

  while (queue.length > 0) {
    const current = queue.shift();
    for (const dependent of dependents.get(current) ?? []) {
      if (!affected.has(dependent)) {
        affected.add(dependent);
        queue.push(dependent);
      }
    }
  }

  return [...affected]
    .map((name) => byName.get(name))
    .filter((workspace) => workspace?.hasBuildScript);
}

export function sortWorkspacesTopologically(workspaces) {
  const { byName } = getWorkspaceMaps(workspaces);
  const selectedNames = new Set(workspaces.map((workspace) => workspace.name));
  const visiting = new Set();
  const visited = new Set();
  const ordered = [];

  function visit(name) {
    if (visited.has(name)) {
      return;
    }

    if (visiting.has(name)) {
      throw new Error(`Cycle detected while sorting workspaces: ${name}`);
    }

    visiting.add(name);
    const workspace = byName.get(name);

    for (const dependency of workspace.internalDependencies) {
      if (selectedNames.has(dependency)) {
        visit(dependency);
      }
    }

    visiting.delete(name);
    visited.add(name);
    ordered.push(workspace);
  }

  for (const workspace of workspaces) {
    visit(workspace.name);
  }

  return ordered;
}

export function resolveRootDir() {
  return resolve(fileURLToPath(new URL('..', import.meta.url)));
}
