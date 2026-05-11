---
title: "Yamblog Core Features"
date: "2026-05-08"
author: "Your Name"
tags: ["features", "typescript"]
excerpt: "Search, RSS, sitemap, related posts, adjacent navigation — all built into @yamblog/core."
draft: false
---

# Yamblog Core Features

All of these come from `@yamblog/core` — the framework-agnostic foundation:

- **Full-text search** across title, excerpt, tags, and content
- **RSS feed generation** (standards-compliant XML)
- **Sitemap generation**
- **Related posts** (configurable: by tags, category, or both)
- **Adjacent posts** (prev/next navigation)
- **Featured posts** filtering
- **Stable IDs** (`"blog-{slug}"`) for wiring into comments, analytics, etc.
- **Reading time** estimation (200 WPM)

The React adapter (`@yamblog/react`) layers client-side search and ready-to-use UI components on top.
