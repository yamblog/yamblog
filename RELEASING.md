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

1. Build all changed packages
2. Run `changeset version` to bump versions and update changelogs
3. Run `changeset publish` to publish to npm
4. Create git tags and GitHub releases

## ⚠️ Do not publish locally

If you have **2FA enabled** on npm, local publishing will fail with `EOTP`. The CI workflow uses an npm automation token which bypasses 2FA. If you absolutely must publish locally, temporarily disable 2FA or use an automation token.

## Emergency: fixing a bad publish

If CI publishes a broken version, create a **new changeset** with a patch bump rather than trying to unpublish. npm does not allow re-publishing the same version.
