---
title: "Hello World"
date: "2026-05-01"
author: "Your Name"
tags: ["general", "intro"]
excerpt: "My first post powered by Yamblog — a blogging platform for the agentic AI era."
featured: true
draft: false
---

# Hello World

Welcome to my blog, powered by **Yamblog**.

This example uses `@yamblog/react` in a Vite SPA. Posts are generated as JSON at build time via `scripts/generate-posts.mjs`, then the React app loads them statically — no server required.

## How it works

1. `npm run generate` — calls `createBlog().getPosts()` and writes `src/generated/posts.json`
2. `vite dev` — starts the dev server, hot-reloading the app
3. `useBlog(posts)` — manages client-side search and filtering
