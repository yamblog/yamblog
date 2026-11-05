# Releasing

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and a **tag-triggered workflow** for publishing. **Do not run `npm publish` manually.**

## 1. Create a changeset after making changes

```bash
bun run changeset
```

Select the packages you changed and choose a bump type (`patch` / `minor` / `major`). This writes a changeset file under `.changeset/`. Do this in every PR that touches a published package.

## 2. When ready to release: apply the versions

```bash
git checkout -b release/version-packages main
bun run version:packages   # applies pending changesets: bumps versions, updates changelogs
bun install                # refresh bun.lock after the version bumps
git add -A && git commit -m "chore: version packages"
git push -u origin release/version-packages
```

Open a PR and merge it once CI passes.

## 3. Tag the release

Tag the version-bump commit on `main` with a `v*` tag matching the new `@yamblog/core` version:

```bash
git checkout main && git pull
git tag v2.0.0
git push origin v2.0.0
```

Pushing the tag triggers the [release workflow](.github/workflows/release.yml), which:

1. **`build` job** (read-only): fails fast if any unapplied changesets remain (step 2 was skipped), then installs with `--frozen-lockfile --ignore-scripts`, builds and tests all packages, and uploads each package's `dist/` as an artifact
2. **`publish` job** (`npm-publish` environment, the only job with `id-token: write`): installs with `--ignore-scripts`, downloads the built `dist/` folders (no build code runs in this job), and runs `changeset publish` — publishes every package whose version isn't on npm via **npm trusted publishing (OIDC)** with provenance
3. Pushes per-package tags (`@yamblog/core@2.0.0`, …) and creates a GitHub release with generated notes

## Trusted publishing (no npm token)

Publishing authenticates with a short-lived OIDC token issued to the release workflow, not a stored npm token. Every `@yamblog/*` package must have a trusted publisher configured on npmjs.com (package → **Settings** → **Trusted publishing** → GitHub Actions):

| Field | Value |
| --- | --- |
| Organization or user | `yamblog` |
| Repository | `yamblog` |
| Workflow filename | `release.yml` |
| Environment | `npm-publish` |

A **new** package must be published once by hand before a trusted publisher can be added to it.

Releases carry [provenance attestations](https://docs.npmjs.com/generating-provenance-statements); verify with `npm audit signatures`.

## ⚠️ Do not publish locally

Never publish from a laptop — releases must come from the workflow so they carry provenance. If you have **2FA enabled** on npm, local publishing fails with `EOTP` anyway.

## Emergency: fixing a bad publish

If CI publishes a broken version, create a **new changeset** with a patch bump rather than trying to unpublish. npm does not allow re-publishing the same version.
