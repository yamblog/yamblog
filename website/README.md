# yamblog.dev

The Yamblog marketing site and docs, built with [Astro](https://astro.build) + [Starlight](https://starlight.astro.build), deployed on Cloudflare.

- The landing page lives in `src/pages/index.astro` (components under `src/components/landing/`).
- Docs pages are loaded straight from the repo's [`docs/`](../docs) directory (see `src/content.config.ts`) — edit those files to change the docs site.
- The site's own blog posts live in `content/posts/` and are rendered with `@yamblog/core` itself (`src/lib/blog.ts`).
- Package version numbers shown on the landing page are read from the workspace `packages/*/package.json` manifests at build time (`src/lib/versions.ts`) — no manual bumps needed.

## Commands

Run from this directory:

| Command       | Action                                                             |
| :------------ | :----------------------------------------------------------------- |
| `bun install` | Install dependencies (from the repo root)                          |
| `bun dev`     | Start the local dev server at `localhost:4321`                     |
| `bun build`   | Build `@yamblog/core` + `@yamblog/remark`, type-check, build site  |
| `bun preview` | Preview the production build locally                               |
