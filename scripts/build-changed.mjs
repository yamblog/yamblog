import { spawnSync } from 'node:child_process';
import {
  collectAffectedWorkspaces,
  getChangedFiles,
  getWorkspaces,
  resolveDefaultSinceRef,
  resolveRootDir,
  sortWorkspacesTopologically,
} from './workspace-graph.mjs';

function parseArgs(argv) {
  const args = { all: false, since: null, head: 'HEAD' };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--all') {
      args.all = true;
      continue;
    }

    if (arg === '--since') {
      args.since = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === '--head') {
      args.head = argv[index + 1] ?? 'HEAD';
      index += 1;
    }
  }

  return args;
}

function runBuild(rootDir, workspace) {
  const result = spawnSync(
    'bun',
    ['run', '--filter', workspace.name, 'build'],
    {
      cwd: rootDir,
      stdio: 'inherit',
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/**
 * Expand a set of workspaces with their transitive internal (workspace)
 * dependencies, so upstream packages get built before the ones that import
 * them through dist/.
 *
 * @param {Array<{ name: string, internalDependencies: string[] }>} allWorkspaces
 *   Every buildable workspace, used to look up dependencies by name.
 * @param {Array<{ name: string, internalDependencies: string[] }>} selectedWorkspaces
 *   The affected workspaces to expand.
 * @returns {Array<{ name: string, internalDependencies: string[] }>}
 *   The selected workspaces plus their dependencies, unordered (sort with
 *   sortWorkspacesTopologically before building).
 */
function withInternalDependencies(allWorkspaces, selectedWorkspaces) {
  const byName = new Map(allWorkspaces.map((workspace) => [workspace.name, workspace]));
  const result = new Map(selectedWorkspaces.map((workspace) => [workspace.name, workspace]));
  const queue = [...selectedWorkspaces];

  while (queue.length > 0) {
    const current = queue.shift();
    for (const dependencyName of current.internalDependencies) {
      const dependency = byName.get(dependencyName);
      if (dependency && !result.has(dependencyName)) {
        result.set(dependencyName, dependency);
        queue.push(dependency);
      }
    }
  }

  return [...result.values()];
}

const rootDir = resolveRootDir();
const args = parseArgs(process.argv.slice(2));
const workspaces = getWorkspaces(rootDir).filter((workspace) => workspace.hasBuildScript);

let selected = workspaces;

if (!args.all) {
  const sinceRef = args.since ?? resolveDefaultSinceRef(rootDir);

  if (!sinceRef) {
    console.log('No baseline ref found. Building all workspaces.');
  } else {
    const changedFiles = getChangedFiles(rootDir, sinceRef, args.head);
    selected = collectAffectedWorkspaces(workspaces, changedFiles);

    if (selected.length === 0) {
      console.log(`No buildable workspace changes detected since ${sinceRef}.`);
      process.exit(0);
    }

    console.log(`Changed since ${sinceRef}:`);
    for (const workspace of selected) {
      console.log(`- ${workspace.name} (${workspace.relDir})`);
    }

    // Affected workspaces resolve internal deps through their built dist/,
    // so build any unchanged upstream workspaces first (e.g. a next-only
    // change still needs @yamblog/core built).
    selected = withInternalDependencies(workspaces, selected);
  }
}

const ordered = sortWorkspacesTopologically(selected);

for (const workspace of ordered) {
  console.log(`\n> Building ${workspace.name}`);
  runBuild(rootDir, workspace);
}
