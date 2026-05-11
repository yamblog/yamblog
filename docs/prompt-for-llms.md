---
title: Prompt for LLMs
description: A copy-paste prompt for coding agents to inspect a project, verify Yamblog support, integrate safely, and create a sample post.
---

# Prompt for LLMs

Use this page when you want a coding agent to integrate Yamblog into an existing project.
The prompt is designed to be safe, explicit, and self-healing:

- inspect the repository before editing
- detect the platform from the codebase
- confirm whether Yamblog supports that platform
- install only the correct packages
- create a sample blog post
- repair bad imports, paths, or route locations instead of stopping at the first mistake

## Supported platforms

Treat these as supported integration targets:

- `Next.js` with `@yamblog/core` and `@yamblog/next`
- `Astro` with `@yamblog/core` and `@yamblog/astro`
- `React/Vite` with `@yamblog/core` and, where useful, `@yamblog/react`

If the project is not based on one of those platforms, the agent should stop and explain the safest fallback instead of inventing unsupported framework APIs.

## Copy-paste prompt

```text
You are integrating YAMBlog into an existing project. Work like a careful senior engineer: inspect first, decide the platform, then implement. Be self-healing: if your first attempt fails, diagnose from the codebase, adjust, and continue until the integration is working or you can prove the platform is unsupported.

Goals:
1. Detect what platform/framework this project uses.
2. Confirm whether that platform is supported by YAMBlog.
3. Integrate YAMBlog using the correct adapter or fallback path.
4. Create a sample blog post file.
5. Verify the integration by checking imports, routes/pages, and expected content paths.
6. If something fails, repair the approach instead of stopping at the first error.

Platform detection rules:
- Inspect `package.json`, lockfiles, config files, and app structure before making changes.
- Look for signals such as:
  - Next.js: `next`, `app/`, `pages/`, `next.config.*`
  - Astro: `astro`, `astro.config.*`, `src/pages/`, `src/content.config.*`
  - React/Vite: `react`, `vite`, `src/main.*`, SPA structure
- State clearly which platform you detected and why.

Supported platform rules:
- Treat these YAMBlog paths as supported:
  - Next.js: use `@yamblog/core` + `@yamblog/next`
  - Astro: use `@yamblog/core` + `@yamblog/astro`
  - React/Vite: use `@yamblog/core` and, where useful, `@yamblog/react`
- Prefer the most native integration for the detected platform.
- If the project is not based on a supported platform, do not force an integration.
- For unsupported platforms:
  - explain the mismatch clearly
  - propose the closest safe fallback using `@yamblog/core`
  - do not invent framework-specific APIs that do not exist

Implementation rules:
- Reuse existing project conventions for package manager, aliases, formatting, and file layout.
- Do not rewrite unrelated code.
- Choose a content directory that matches the platform and project structure:
  - Next.js: prefer `content/posts`
  - Astro: prefer `src/content/posts`
  - React/Vite: prefer `content/posts` or another clearly project-local content folder
- Create the minimum files needed for a working first post flow.
- If a YAMBlog package or API name appears not to work, inspect the local code/docs/examples and correct the integration rather than guessing.

Self-healing behavior:
- Before changing code, inspect the project structure and summarize the plan.
- After each significant edit, sanity-check the result against the detected framework conventions.
- If an import fails, search the installed codebase or docs/examples and replace it with the correct export.
- If a route or file location is wrong, move it to the framework-correct location.
- If a content directory does not match the blog config, reconcile them.
- If a package is missing, add only the package(s) required for the detected platform.
- If the framework is unsupported, stop implementation and produce a precise fallback plan instead of broken code.
- Never hallucinate success. Verify.

Required sample blog post:
Create a sample markdown file named `hello-world.md` in the chosen posts directory with this content:

---
title: "Hello World"
date: "2026-05-01"
author: "Your Name"
tags: ["general", "intro"]
excerpt: "My first post powered by Yamblog."
featured: true
draft: false
---

# Hello World

Welcome to my blog, powered by **Yamblog**.

This is the first post in this project.

## Why this exists

This sample post verifies that:
- frontmatter is parsed
- the content directory is wired correctly
- the project can render or load a Yamblog post

Final output format:
1. Detected platform
2. Supported or unsupported decision
3. Files created or changed
4. Exact integration summary
5. Verification performed
6. Any remaining gaps or follow-up steps

Start by inspecting the project and explicitly naming the detected platform before editing anything.
```

## Homepage-sized version

Use this when you only need a short prompt on a landing page:

```text
Inspect this codebase. If it uses a supported Yamblog platform, verify the official Yamblog docs, install the correct packages, integrate Yamblog, create a sample hello-world post, verify the setup, and stop with a clear explanation if the platform is unsupported.
```

## Related guides

- [Getting Started](./getting-started.md) for human-led installation
- [AI Agent Authoring](./ai-agent-authoring.md) for post generation and validation workflows
- [llms.txt](./llms-txt.md) for exposing your blog to language models after setup
