# Releasing

This repo uses [Changesets](https://github.com/changesets/changesets) to version and publish packages. **Do not run `npm publish` manually.**

## 1. Create a changeset after making changes

```bash
bun run changeset
```

Select the packages you changed and choose a bump type (`patch` / `minor` / `major`). This writes a changeset file under `.changeset/`.

## 2. Commit the changeset

```bash
git add .changeset/*.md
git commit -m "feat: add new feature"
git push
```

## 3. Let CI handle the rest

When your PR merges to `main`, the [release workflow](.github/workflows/ci.yml) will:

1. Build all packages
2. Use `changesets/action@v1` to version packages, update changelogs, and publish to npm
3. Create git tags and GitHub releases

## Manual fallback (if the Version Packages PR fails)

The automated flow needs the repo setting **Settings → Actions → General →
"Allow GitHub Actions to create and approve pull requests"** enabled so
`changesets/action` can open the Version Packages PR. If PR creation fails,
release manually — no local npm auth needed:

```bash
git checkout -b release/version-packages main
bun run version:packages   # applies pending changesets: bumps versions, updates changelogs
bun install                # refresh bun.lock after the version bumps
git add -A && git commit -m "chore: version packages"
git push -u origin release/version-packages
```

Open and merge that PR. On the next push to `main` the release job finds no
pending changesets and runs the publish step directly — publishing to npm and
creating git tags + GitHub releases. The release job can also be triggered by
hand via **Actions → CI → Run workflow** on `main`.

## ⚠️ Do not publish locally

If you have **2FA enabled** on npm, local publishing will fail with `EOTP`. The CI workflow uses an npm automation token which bypasses 2FA. If you absolutely must publish locally, use an npm automation token.

## Emergency: fixing a bad publish

If CI publishes a broken version, create a **new changeset** with a patch bump rather than trying to unpublish. npm does not allow re-publishing the same version.
