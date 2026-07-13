# Contributing to YAMBLOG

Thanks for your interest in contributing! This document covers everything you need to get a local environment running and land a change.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.3 (the repo pins the exact version via the `packageManager` field)
- Node.js ≥ 22 (used by some framework tooling in the examples)

## Getting started

```bash
git clone https://github.com/yamblog/yamblog.git
cd yamblog
bun install
```

> **Note:** if you change any `package.json`, run `bun install` and commit the updated `bun.lock`. CI installs with `--frozen-lockfile` and fails on a stale lockfile.

## Repository layout

| Path | What it is |
| --- | --- |
| `packages/core` | Framework-agnostic engine: parsing, querying, search, RSS, sitemap, llms.txt |
| `packages/next` | Next.js adapter (App Router metadata, RSS/sitemap handlers, OG images, components) |
| `packages/react` | React adapter (markdown renderer, hooks, UI components) |
| `packages/astro` | Astro adapter (Content Layer loader, `.astro` components) |
| `packages/remark` | Remark/rehype plugins (TOC, embeds, interactive blocks) |
| `examples/*` | Runnable example apps for each framework |
| `website/` | The [yamblog.dev](https://yamblog.dev) docs site (Astro Starlight) |
| `docs/` | Markdown docs: architecture, recipes, AI-agent authoring |

## Common commands

```bash
bun run build      # build all packages (also validates example content)
bun run test       # build, then run all package test suites
bun run typecheck  # tsc --noEmit across all packages
bun run lint       # ESLint across all packages
bun run dev:website  # run the docs site locally
bun run example:next # run the Next.js example app
```

> **Build before test:** adapter tests import `@yamblog/core` from its built `dist/` output, so tests need an up-to-date build. The root `bun run test` script builds first automatically; if you run a single package's tests directly (`cd packages/astro && bun test`), run `bun run build` from the root at least once beforehand.

## Making a change

1. Fork and create a branch from `main`.
2. Make your change. Add or update tests in the affected package's `test/` directory.
3. Run `bun run test`, `bun run typecheck`, and `bun run lint` — CI runs all three.
4. If your change affects a published package, add a changeset:

   ```bash
   bun run changeset
   ```

   Pick the packages you touched and a bump type (`patch` for fixes, `minor` for new features, `major` for breaking changes). Commit the generated file under `.changeset/`.
5. Open a pull request. The PR template will walk you through the checklist.

Docs-only, website-only, and example-only changes don't need a changeset.

## Publishing

Releases are fully automated through CI — see [RELEASING.md](RELEASING.md). Never `npm publish` manually.

## Questions / ideas

Open an issue — bug reports and feature requests both have templates. For anything else, start a discussion or reach out via [bnap.dev](https://bnap.dev).
