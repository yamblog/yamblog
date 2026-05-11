---
title: "Why I Built Yamblog"
date: "2026-05-11"
author: "Bharat Parsiya"
tags: ["announcement", "origin-story", "blogging", "nextjs", "react"]
excerpt: "Why I built Yamblog, why I open sourced it, and why blogs still matter even in the era of vibe-coded SaaS apps."
draft: false
---

Now that everyone and their dog is creating vibe-coded SaaS apps, I still think a blog is one of the best ways to get search discoverability.

A landing page can explain the pitch, but a blog compounds. It gives you a place to publish product updates, technical writeups, launch notes, and answers to questions people are already searching for.

## The repetition that led to this package

After trying to create a few projects myself, I noticed I was rebuilding the same blog module again and again.

Every project wanted the same things:

- markdown posts in the repo
- frontmatter validation
- clean slugs
- search
- RSS
- sitemap generation
- framework-friendly rendering
- llms.txt
- enough structure that an AI agent could work with it safely

At some point the repetition stopped being reasonable. Instead of rebuilding blog infrastructure for every new app, I decided to turn it into a reusable package I could carry into upcoming projects.

## Inspired by Starlight, built for my stack

This project is inspired by Astro Starlight. I like how it treats content seriously and gives you a strong publishing foundation.

But my preferred stack is React and Next.js, so I did not want a solution tied to one framework choice. That is what pushed Yamblog toward a multi-framework architecture: a core package for content and metadata, then adapters for the environments I actually build in.

I also wanted it to be vibe-coding friendly. A blog system should be easy to set up, easy to write in, and easy to maintain when a lot of the work is happening in an editor with AI assistance.

## Why open source it

I decided to open source Yamblog because this kind of tooling should save more than just my own time.

If it helps other builders avoid repeating the same setup, that means:

- less wasted engineering time
- fewer duplicate prompts and token spend
- less energy burned on infrastructure that should already exist

That is the point of Yamblog. Keep the content in your repo, keep the workflow simple, and stop rebuilding the same blog system from scratch.

It should be a clean, vibe-coding friendly way to set up, write, validate, and maintain a blog across projects.
