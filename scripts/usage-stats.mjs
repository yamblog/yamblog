#!/usr/bin/env node
// Usage-stats snapshot for the @yamblog packages. Repo tooling only: this file
// is not part of any package and never ships in an npm tarball.
//
// Fetches, for each published package: npm last-week / last-month downloads,
// per-version last-week downloads and ecosyste.ms dependent counts; plus the
// GitHub repo's stars/forks and, when a token with push access is given, the
// 14-day traffic (views, clones, referrers, paths).
//
// Writes:
//   <out>/snapshots/<date>.json   full snapshot, including every endpoint error
//   <out>/weekly.csv              one row per package per date
//
// Usage:
//   node scripts/usage-stats.mjs [--out <dir>] [--date YYYY-MM-DD]
//
// Environment:
//   USAGE_STATS_OUT       output dir (default: ./data); --out wins
//   USAGE_STATS_DATE      snapshot date label (default: today, UTC); --date wins.
//                         It only names the snapshot; the data is always current.
//   GH_TRAFFIC_TOKEN      token with Administration: read, enables traffic
//   GITHUB_TOKEN          optional, only used for the public repo metadata call
//                         (avoids the 60/h unauthenticated rate limit)
//
// Failure policy: a failed or malformed endpoint is recorded under `errors`
// in the JSON and leaves its CSV cell empty; it never aborts the run. Only if
// every endpoint fails does it exit 1 without writing anything. Files
// are written to a temp file and renamed, so a crash cannot leave a partial
// file. Running twice on the same date replaces that date's CSV rows instead
// of appending duplicates (a value the new run failed to fetch keeps the
// earlier run's value).
//
// Requires Node >= 22 (global fetch, AbortSignal.timeout). Zero dependencies.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const PACKAGES = ['core', 'remark', 'react', 'next', 'astro'].map((p) => `@yamblog/${p}`);
const REPO = 'yamblog/yamblog';
const USER_AGENT = 'usage-stats-script (+https://github.com/yamblog/yamblog)';
const TIMEOUT_MS = 20_000;
const CSV_COLUMNS = [
  'date',
  'package',
  'last_week',
  'last_month',
  'dependent_repos',
  'dependent_packages',
  'stars',
  'forks',
];

const { values: args } = parseArgs({
  options: {
    out: { type: 'string' },
    date: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
  strict: true,
});

if (args.help) {
  console.log('Usage: node scripts/usage-stats.mjs [--out <dir>] [--date YYYY-MM-DD]');
  process.exit(0);
}

const outDir = resolve(args.out ?? process.env.USAGE_STATS_OUT ?? 'data');
const date = args.date ?? process.env.USAGE_STATS_DATE ?? new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
  console.error(`usage-stats: invalid date "${date}", expected YYYY-MM-DD`);
  process.exit(2);
}

const errors = [];

/** GET JSON; on any failure record an error and return null. */
async function getJson(label, url, headers = {}) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': USER_AGENT, accept: 'application/json', ...headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return await res.json();
      // Retry once on rate limiting / server errors; anything else is final.
      if (attempt === 1 && (res.status === 429 || res.status >= 500)) {
        const retryAfter = Number(res.headers.get('retry-after'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 30) * 1000 : 5_000;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      errors.push({ endpoint: label, url, error: `HTTP ${res.status}` });
      return null;
    } catch (err) {
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 3_000));
        continue;
      }
      errors.push({ endpoint: label, url, error: String(err?.message ?? err) });
      return null;
    }
  }
  return null;
}

/** Pull a non-negative integer out of a response, recording a shape error otherwise. */
function num(label, obj, key) {
  if (obj == null) return null;
  const v = obj[key];
  if (Number.isInteger(v) && v >= 0) return v;
  errors.push({ endpoint: label, error: `unexpected response shape: "${key}" is ${JSON.stringify(v)}` });
  return null;
}

async function npmStats(pkg) {
  const enc = pkg.replaceAll('/', '%2F');
  const [week, month, versions, eco] = await Promise.all([
    getJson(`npm last-week ${pkg}`, `https://api.npmjs.org/downloads/point/last-week/${pkg}`),
    getJson(`npm last-month ${pkg}`, `https://api.npmjs.org/downloads/point/last-month/${pkg}`),
    getJson(`npm versions ${pkg}`, `https://api.npmjs.org/versions/${enc}/last-week`),
    getJson(
      `ecosyste.ms ${pkg}`,
      `https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages/${enc}`,
    ),
  ]);
  let perVersion = null;
  if (versions != null) {
    if (versions.downloads && typeof versions.downloads === 'object') {
      perVersion = versions.downloads;
    } else {
      errors.push({ endpoint: `npm versions ${pkg}`, error: 'unexpected response shape: no "downloads" object' });
    }
  }
  return {
    lastWeek: num(`npm last-week ${pkg}`, week, 'downloads'),
    lastWeekRange: week ? { start: week.start ?? null, end: week.end ?? null } : null,
    lastMonth: num(`npm last-month ${pkg}`, month, 'downloads'),
    lastMonthRange: month ? { start: month.start ?? null, end: month.end ?? null } : null,
    perVersionLastWeek: perVersion,
    dependentRepos: num(`ecosyste.ms ${pkg}`, eco, 'dependent_repos_count'),
    dependentPackages: num(`ecosyste.ms ${pkg}`, eco, 'dependent_packages_count'),
  };
}

async function githubStats() {
  const base = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' };
  const metaToken = process.env.GH_TRAFFIC_TOKEN || process.env.GITHUB_TOKEN;
  const repo = await getJson(
    'github repo',
    `https://api.github.com/repos/${REPO}`,
    metaToken ? { ...base, authorization: `Bearer ${metaToken}` } : base,
  );
  const gh = {
    stars: num('github repo', repo, 'stargazers_count'),
    forks: num('github repo', repo, 'forks_count'),
    watchers: num('github repo', repo, 'subscribers_count'),
    openIssuesAndPrs: num('github repo', repo, 'open_issues_count'),
    traffic: null,
  };
  const trafficToken = process.env.GH_TRAFFIC_TOKEN;
  if (trafficToken) {
    const auth = { ...base, authorization: `Bearer ${trafficToken}` };
    const t = (p) => getJson(`github traffic ${p}`, `https://api.github.com/repos/${REPO}/traffic/${p}`, auth);
    const [views, clones, referrers, paths] = await Promise.all([
      t('views?per=day'),
      t('clones?per=day'),
      t('popular/referrers'),
      t('popular/paths'),
    ]);
    gh.traffic = { views, clones, referrers, paths };
  } else {
    gh.traffic = { skipped: 'GH_TRAFFIC_TOKEN not set' };
  }
  return gh;
}

/** Write via temp file + rename so readers never see a half-written file. */
function writeAtomic(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, content);
  renameSync(tmp, file);
}

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Minimal parser for the rows this script writes (handles quoted cells). */
function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { cells.push(cur); cur = ''; }
    else cur += c;
  }
  cells.push(cur);
  return cells;
}

function updateCsv(file, snapshot) {
  const header = CSV_COLUMNS.join(',');
  let lines = [];
  if (existsSync(file)) {
    lines = readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length > 0 && lines[0] !== header) {
      throw new Error(
        `${file} has header "${lines[0]}", expected "${header}". Refusing to modify it; migrate the file first.`,
      );
    }
    lines = lines.slice(1);
  }

  // Earlier rows for this date, keyed by package, so a rerun replaces them.
  const previous = new Map();
  const kept = [];
  for (const line of lines) {
    const cells = parseCsvLine(line);
    if (cells.length === CSV_COLUMNS.length && cells[0] === date) previous.set(cells[1], cells);
    else kept.push(line);
  }

  const fresh = [];
  for (const [pkg, d] of Object.entries(snapshot.npm)) {
    const values = [
      date,
      pkg,
      d.lastWeek,
      d.lastMonth,
      d.dependentRepos,
      d.dependentPackages,
      snapshot.github.stars,
      snapshot.github.forks,
    ];
    const old = previous.get(pkg);
    // Keep an earlier same-day value where this run failed to fetch one.
    const merged = values.map((v, i) => (v == null && old && old[i] !== '' ? old[i] : v));
    previous.delete(pkg);
    // A row with no data at all carries nothing; leave it out.
    if (merged.slice(2).every((v) => v == null || v === '')) continue;
    fresh.push(merged.map(csvCell).join(','));
  }
  // Rows for this date whose package is no longer tracked: keep them as they were.
  for (const cells of previous.values()) fresh.push(cells.map(csvCell).join(','));

  writeAtomic(file, [header, ...kept, ...fresh].join('\n') + '\n');
  return fresh.length;
}

const npm = {};
for (const pkg of PACKAGES) npm[pkg] = await npmStats(pkg); // sequential: be polite to the APIs
const github = await githubStats();

const snapshot = {
  schema: 1,
  date,
  generatedAt: new Date().toISOString(),
  repo: REPO,
  npm,
  github,
  errors,
};

const jsonFile = join(outDir, 'snapshots', `${date}.json`);
const csvFile = join(outDir, 'weekly.csv');

const gotAnything =
  Object.values(npm).some((d) => Object.values(d).some((v) => v != null)) ||
  github.stars != null;
if (!gotAnything) {
  for (const e of errors) console.error(`usage-stats: error: ${e.endpoint}: ${e.error}`);
  console.error('usage-stats: every endpoint failed; nothing written.');
  process.exit(1);
}

// A same-day rerun only replaces the JSON snapshot if it is at least as complete.
let previousErrors = Infinity;
try {
  previousErrors = JSON.parse(readFileSync(jsonFile, 'utf8')).errors?.length ?? Infinity;
} catch {
  // no earlier snapshot for this date (or unreadable): write ours
}
if (errors.length <= previousErrors) {
  writeAtomic(jsonFile, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`usage-stats: wrote ${jsonFile}`);
} else {
  console.log(`usage-stats: kept existing ${jsonFile} (it has fewer errors than this run)`);
}
let rows;
try {
  rows = updateCsv(csvFile, snapshot);
} catch (err) {
  console.error(`usage-stats: ${err.message}`);
  process.exit(1);
}

console.log(`usage-stats: ${rows} row(s) for ${date} in ${csvFile}`);
for (const e of errors) {
  const msg = `${e.endpoint}: ${e.error}`;
  // Surface as an annotation in GitHub Actions, plain text elsewhere.
  console.log(process.env.GITHUB_ACTIONS ? `::warning title=usage-stats::${msg}` : `usage-stats: error: ${msg}`);
}
