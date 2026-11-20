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

Packages are versioned independently (a release may bump only `@yamblog/next`, say), so the tag names the **release**, not a package version. Tag the merged version-bump commit on `main` with `release-YYYY-MM-DD` (append `.2`, `.3`, … for a second release on the same day):

```bash
git checkout main && git pull
git tag release-2026-11-20
git push origin release-2026-11-20
```

The legacy `vX.Y.Z` form (`v2.0.0`, `v2.1.0`) is still accepted, but do not use it for new releases: it cannot express a release that leaves `@yamblog/core` unchanged. Other tag names (`v-test`, `v2.1.0-beta`, …) do not trigger the workflow.

Pushing the tag triggers the [release workflow](.github/workflows/release.yml), which:

1. **`build` job** (read-only): fails fast if the tag does not match the scheme, if the tagged commit is not on `main`, if any unapplied changesets remain (step 2 was skipped), or if every package version on the commit is already on npm (nothing to release). It then installs with `--frozen-lockfile --ignore-scripts`, builds and tests all packages, and uploads each package's `dist/` as an artifact
2. **`publish` job** (`npm-publish` environment, the only job with `id-token: write`): installs with `--ignore-scripts`, downloads the built `dist/` folders (no build code runs in this job), and runs `changeset publish` — publishes every package whose version isn't on npm via **npm trusted publishing (OIDC)** with provenance
3. Pushes per-package tags (`@yamblog/core@2.0.0`, …) and creates a GitHub release named after the release tag, with generated notes

If the publish job fails part-way, use **Re-run failed jobs** rather than re-running the whole workflow: the build job's "nothing to publish" guard fails once every version is on npm.

## Repository settings (configure by hand)

The guards in the `build` job only catch accidents. A tag pushed on any commit runs *that commit's* copy of `release.yml`, so anyone who can push a tag could remove them, and npm trusted publishing checks the workflow filename and environment, not the ref. **The real control is GitHub-side configuration**, which is not stored in this repository and must be set up and checked by a maintainer:

- **Environment `npm-publish`** (Settings → Environments):
  - *Required reviewers*: at least one maintainer other than the person tagging, with "Prevent self-review" on.
  - *Deployment branches and tags*: "Selected branches and tags", allowing only the tag patterns `release-*` and `v*`. Nothing else may deploy to it.
- **Tag ruleset** (Settings → Rules → Rulesets → New tag ruleset) targeting `release-*` and `v*`: restrict creation, update and deletion to maintainers (bypass list), and block force-pushes.
- **Branch protection on `main`**: require pull requests and passing CI, so the ancestor-of-main guard means "reviewed code".

Re-check these settings whenever maintainers change.

## Trusted publishing (no npm token)

Publishing authenticates with a short-lived OIDC token issued to the release workflow, not a stored npm token. Every `@yamblog/*` package must have a trusted publisher configured on npmjs.com (package → **Settings** → **Trusted publishing** → GitHub Actions):

| Field | Value |
| --- | --- |
| Organization or user | `yamblog` |
| Repository | `yamblog` |
| Workflow filename | `release.yml` |
| Environment | `npm-publish` |

A **new** package must be published once by hand before a trusted publisher can be added to it.

Releases published through this workflow carry [provenance attestations](https://docs.npmjs.com/generating-provenance-statements); verify with `npm audit signatures`. Versions published before trusted publishing was set up (2026-11-05; the latest of these are core 2.1.0, astro 1.3.0, next 1.2.0, react 1.1.1, remark 1.1.1) have registry signatures but no provenance; see [SECURITY.md](SECURITY.md#supply-chain).

**Token fallback.** The first attempt through OIDC (`release-2026-11-20`) failed with `ENEEDAUTH` because the packages had no trusted publisher configured. Until they do, the publish job uses an `NPM_TOKEN` secret when one is set. Store it as an **environment secret on `npm-publish`** (Settings → Environments → npm-publish → Environment secrets), not as a repository secret: a repository secret is readable by any workflow in the repo, while an environment secret is only released to the publish job after the environment's protection rules pass. Remove any repository-level copy. Use a granular token limited to publishing the `@yamblog/*` packages; releases still carry provenance, generated from the job's OIDC token. Once every package has the trusted publisher above, delete the `NPM_TOKEN` secret and revoke the token on npmjs.com.

The OIDC publish path has not yet run end to end. Before the first release through it, confirm that **every** `@yamblog/*` package has the trusted publisher above configured, and prefer making that first release a low-stakes patch (for example a patch of all five packages) rather than a major, so a misconfiguration is cheap to fix.

## ⚠️ Do not publish locally

Never publish from a laptop — releases must come from the workflow so they carry provenance. If you have **2FA enabled** on npm, local publishing fails with `EOTP` anyway.

## Emergency: fixing a bad publish

If CI publishes a broken version, create a **new changeset** with a patch bump rather than trying to unpublish. npm does not allow re-publishing the same version.
