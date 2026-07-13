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

1. Builds and tests all packages
2. Fails fast if any unapplied changesets remain (step 2 was skipped)
3. Runs `changeset publish` — publishes every package whose version isn't on npm, using the `NPM_TOKEN` automation token
4. Pushes per-package tags (`@yamblog/core@2.0.0`, …) and creates a GitHub release with generated notes

## ⚠️ Do not publish locally

If you have **2FA enabled** on npm, local publishing will fail with `EOTP`. The release workflow uses an npm automation token which bypasses 2FA.

## Emergency: fixing a bad publish

If CI publishes a broken version, create a **new changeset** with a patch bump rather than trying to unpublish. npm does not allow re-publishing the same version.
