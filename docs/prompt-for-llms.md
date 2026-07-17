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
You are integrating YAMBlog (https://github.com/yamblog/yamblog) into an existing project. Inspect first, then implement. If an attempt fails, diagnose from the codebase and the installed packages, fix, and continue. Never invent API names, and never claim success without running the verification step.

1. Detect the platform. Read package.json, the lockfile, and config files before editing anything, then state what you found and why:
   - Next.js (`next` dependency, app/ or pages/)  → @yamblog/core + @yamblog/next
   - Astro (`astro` dependency, astro.config.*)   → @yamblog/core + @yamblog/astro
   - React + Vite (`react` + `vite`)              → @yamblog/core (+ @yamblog/react for UI)
   Anything else is unsupported: stop, explain the mismatch, and propose the closest safe fallback using @yamblog/core only — do not force a broken integration.

2. Install the packages for the detected platform, using the project's own package manager (check which lockfile exists).

3. Create the content directory and a shared blog instance, following the project's conventions for file placement and aliases:
   - content dir: content/posts (Next.js, React/Vite) or src/content/posts (Astro)
   - instance (this API is real — start from it, do not improvise):
       import { defineBlog } from '@yamblog/core';
       export const blog = defineBlog('<content dir>');

4. Create <content dir>/hello-world.md. Use today's real date. Do NOT add a slug field — slugs are derived from the filename:
   ---
   title: "Hello World"
   date: "<YYYY-MM-DD>"
   author: "Your Name"
   tags: ["intro"]
   excerpt: "My first post powered by Yamblog."
   draft: false
   ---

   Welcome to my blog, powered by **Yamblog**.

5. Wire the minimal routes (a listing page calling blog.getPosts() and a post page calling blog.getPostBySlug(slug)) using the adapter's documented exports. If an import fails, read the installed package or https://yamblog.dev/getting-started/ and correct it — do not guess names.

6. Verify before declaring success:
   - `await blog.validateContent()` passes — it throws on invalid frontmatter, a missing content directory, or duplicate slugs
   - `await blog.getPostBySlug('hello-world')` returns the sample post
   - the project builds (or the blog route renders in the dev server)
   If a check fails, fix the cause — wrong import, wrong route location, content dir not matching the config — and re-verify.

Finish with a short report: detected platform (or unsupported + fallback plan), files created or changed, verification performed, and any remaining gaps.
```

## Homepage-sized version

Use this when you only need a short prompt on a landing page:

```text
Inspect this project. If it uses a supported Yamblog platform (Next.js, Astro, or React/Vite), integrate Yamblog using the official docs, create a sample hello-world post, verify the setup, and stop with a clear explanation if the platform is unsupported.
```

## Related guides

- [Getting Started](./getting-started.md) for human-led installation
- [AI Agent Authoring](./ai-agent-authoring.md) for post generation and validation workflows
- [llms.txt](./llms-txt.md) for exposing your blog to language models after setup
