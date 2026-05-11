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
  }
}

const ordered = sortWorkspacesTopologically(selected);

for (const workspace of ordered) {
  console.log(`\n> Building ${workspace.name}`);
  runBuild(rootDir, workspace);
}
