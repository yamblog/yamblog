# YAMBLOG

YAMBLOG is a file-based markdown blog engine for modern web apps.

Now that everyone and their dog is shipping vibe-coded SaaS apps, a blog is still one of the best ways to get search discoverability.

After building a few projects, I kept reaching for the same blog module again and again. Every new app needed markdown posts, metadata, feeds, search, and a clean way to render content inside the framework I was using. Rebuilding that stack in every repo was repetitive, expensive in tokens, and a waste of energy, so I pulled it into a package I can reuse across upcoming projects.

YAMBLOG is inspired by Astro Starlight, but my preferred stack is React and Next.js. That pushed me to build a multi-framework blogging system instead of a framework-specific setup. The result is a core package for content and metadata, plus adapters for the rendering environments I actually want to ship with.

It is also intentionally vibe-coding friendly. The goal is to make blog setup, writing, validation, and ongoing maintenance simple enough that a developer or an AI agent can work with the content model without fighting hidden CMS rules or brittle integration code.

I decided to open source it because this is the kind of infrastructure that should not need to be rebuilt from scratch every time. If it saves people time, tokens, and energy, it is worth putting out in the open.

## Publishing (for maintainers)

This repo uses [Changesets](https://github.com/changesets/changesets) to version and publish packages. **Do not run `npm publish` manually.**

### 1. Create a changeset after making changes

```bash
bun run changeset
```

Select the packages you changed and choose a bump type (`patch` / `minor` / `major`). This writes a changeset file under `.changeset/`.

### 2. Commit the changeset

```bash
git add .changeset/*.md
git commit -m "feat: add new feature"
git push
```

### 3. Let CI handle the rest

When your PR merges to `main`, the [release workflow](.github/workflows/release.yml) will:

1. Build all changed packages
2. Run `changeset version` to bump versions and update changelogs
3. Run `changeset publish` to publish to npm
4. Create git tags and GitHub releases

### ⚠️ Do not publish locally

If you have **2FA enabled** on npm, local publishing will fail with `EOTP`. The CI workflow uses an npm automation token which bypasses 2FA. If you absolutely must publish locally, temporarily disable 2FA or use an automation token.

### Emergency: fixing a bad publish

If CI publishes a broken version, create a **new changeset** with a patch bump rather than trying to unpublish. npm does not allow re-publishing the same version.

---

Created by [Bharat Parsiya](https://bnap.dev).

Website: [yamblog.dev](https://yamblog.dev)

Getting started: [yamblog.dev/getting-started/](https://yamblog.dev/getting-started/)
