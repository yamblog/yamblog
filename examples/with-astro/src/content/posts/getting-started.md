---
title: "Getting Started with Yamblog on Astro"
date: "2026-05-05"
author: "Your Name"
tags: ["tutorial", "astro"]
excerpt: "A step-by-step guide to installing and configuring Yamblog in an Astro project."
draft: false
---

# Getting Started with Yamblog on Astro

This guide walks you through installing Yamblog in an existing Astro project using the Content Layer API.

## Install

```bash
npm install @yamblog/core @yamblog/astro
```

## Define your collection

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { yamblogLoader } from '@yamblog/astro';

const blog = defineCollection({
  loader: yamblogLoader({ base: './src/content/posts' }),
});

export const collections = { blog };
```

## Add pages

Create `src/pages/blog/index.astro` for the listing and `src/pages/blog/[slug].astro` for individual posts.

## That's it

Yamblog handles reading, parsing, validating, and sorting your posts. You get full type safety and zero CMS overhead.
