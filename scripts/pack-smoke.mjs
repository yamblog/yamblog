// Pack every published @yamblog/* package the way npm publishes it, install
// the tarballs into a throwaway project and load each entry point under the
// current Node (both `import` and `require`). Catches what `bun test` in the
// workspace cannot: files missing from the tarball, `exports` pointing at
// nothing, specifiers Node cannot resolve, and bundled third-party code.
//
// Usage (after `bun run build`):
//   node scripts/pack-smoke.mjs [--keep] [--out <dir>]
//
// Needs network access to install the packages' dependencies from npm.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getWorkspaces, resolveRootDir } from './workspace-graph.mjs';

// Entry points that only load through a bundler, not under plain Node.
// Keep this list short and explain every entry.
const BUNDLER_ONLY = new Map([
  // Re-exports og.js; @vercel/og 1.x only loads inside Next.js' bundler.
  ['@yamblog/next', 'root entry re-exports ./og (@vercel/og needs a bundler)'],
  ['@yamblog/next/og', '@vercel/og 1.x needs a bundler'],
]);

// Strings that must never appear in a packed package's JS (bundled
// third-party code). Applied to the packages listed here.
const DIST_GUARDS = new Map([
  [
    '@yamblog/next',
    [
      ['node_modules/', 'inlined node_modules code'],
      ['react.development', 'inlined React development build'],
      ['react.production', 'inlined React production build'],
    ],
  ],
]);

function parseArgs(argv) {
  const args = { keep: false, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--keep') args.keep = true;
    else if (argv[i] === '--out') {
      args.out = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function run(cmd, cmdArgs, cwd) {
  return execFileSync(cmd, cmdArgs, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

/** Every concrete file target of an `exports` map, by subpath. */
export function exportTargets(exportsField) {
  const out = [];
  const visit = (subpath, value) => {
    if (typeof value === 'string') out.push([subpath, value]);
    else if (value && typeof value === 'object') {
      for (const nested of Object.values(value)) visit(subpath, nested);
    }
  };
  if (typeof exportsField === 'string') visit('.', exportsField);
  else for (const [subpath, value] of Object.entries(exportsField ?? {})) visit(subpath, value);
  return out;
}

/** Import specifiers worth loading under Node: JS entries, no wildcards. */
export function loadableSpecifiers(name, exportsField) {
  const specs = new Set();
  for (const [subpath, target] of exportTargets(exportsField)) {
    if (subpath.includes('*') || subpath === './package.json') continue;
    if (!/\.(c|m)?js$/.test(target)) continue;
    specs.add(subpath === '.' ? name : `${name}/${subpath.slice(2)}`);
  }
  return [...specs];
}

/** Problems with a packed package's file list and contents. */
export function checkPackedFiles(name, pkg, packageDir) {
  const problems = [];
  const files = walk(packageDir).map((file) => file.slice(packageDir.length + 1).replace(/\\/g, '/'));

  for (const file of files) {
    if (file.split('/').includes('node_modules')) problems.push(`${name}: tarball contains ${file}`);
  }
  for (const [subpath, target] of exportTargets(pkg.exports)) {
    if (!existsSync(join(packageDir, target))) {
      problems.push(`${name}: exports["${subpath}"] -> ${target} is not in the tarball`);
    }
  }
  for (const [needle, why] of DIST_GUARDS.get(name) ?? []) {
    for (const file of files.filter((f) => /\.(c|m)?js$/.test(f))) {
      if (readFileSync(join(packageDir, file), 'utf8').includes(needle)) {
        problems.push(`${name}: ${file} contains "${needle}" (${why})`);
      }
    }
  }
  return problems;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = resolveRootDir();
  const workDir = args.out ? resolve(args.out) : mkdtempSync(join(tmpdir(), 'yamblog-pack-smoke-'));
  const tarballDir = join(workDir, 'tarballs');
  const projectDir = join(workDir, 'project');
  mkdirSync(tarballDir, { recursive: true });
  mkdirSync(projectDir, { recursive: true });

  const packages = getWorkspaces(rootDir).filter(
    (workspace) => !workspace.private && workspace.relDir.startsWith('packages/'),
  );
  const problems = [];
  const tarballs = [];
  const manifests = new Map();

  for (const workspace of packages) {
    const pkg = JSON.parse(readFileSync(join(workspace.dir, 'package.json'), 'utf8'));
    if (!existsSync(join(workspace.dir, 'dist'))) {
      problems.push(`${pkg.name}: dist/ missing; run \`bun run build\` first`);
      continue;
    }
    const [packed] = JSON.parse(
      run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', tarballDir], workspace.dir),
    );
    const tarball = join(tarballDir, packed.filename);
    console.log(`packed ${pkg.name}@${pkg.version} (${packed.entryCount} files, ${packed.size} bytes)`);

    const extractDir = join(workDir, 'extracted', packed.filename.replace(/\.tgz$/, ''));
    mkdirSync(extractDir, { recursive: true });
    run('tar', ['-xzf', tarball, '-C', extractDir], rootDir);
    problems.push(...checkPackedFiles(pkg.name, pkg, join(extractDir, 'package')));

    tarballs.push(tarball);
    manifests.set(pkg.name, pkg);
  }

  if (problems.length === 0) {
    writeFileSync(
      join(projectDir, 'package.json'),
      `${JSON.stringify({ name: 'yamblog-pack-smoke', private: true, type: 'module' }, null, 2)}\n`,
    );
    console.log(`\ninstalling ${tarballs.length} tarballs into ${projectDir}`);
    // npm >= 7 installs peer dependencies automatically.
    run('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts', ...tarballs], projectDir);

    for (const [name, pkg] of manifests) {
      for (const spec of loadableSpecifiers(name, pkg.exports)) {
        if (BUNDLER_ONLY.has(spec)) {
          console.log(`skip    ${spec} (${BUNDLER_ONLY.get(spec)})`);
          continue;
        }
        for (const [mode, code] of [
          ['import', `await import(${JSON.stringify(spec)});`],
          ['require', `require(${JSON.stringify(spec)});`],
        ]) {
          const nodeArgs =
            mode === 'import' ? ['--input-type=module', '-e', code] : ['--input-type=commonjs', '-e', code];
          try {
            run(process.execPath, nodeArgs, projectDir);
            console.log(`ok      ${mode.padEnd(7)} ${spec}`);
          } catch (error) {
            const stderr = String(error.stderr ?? error.message).trim().split('\n').slice(0, 6).join('\n    ');
            problems.push(`${spec}: ${mode}() failed under Node ${process.version}:\n    ${stderr}`);
          }
        }
      }
    }
  }

  if (!args.keep && !args.out) rmSync(workDir, { recursive: true, force: true });

  if (problems.length > 0) {
    console.error(`\npack-smoke: ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`\npack-smoke: OK under Node ${process.version}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
