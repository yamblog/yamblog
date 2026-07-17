---
title: "Why Your Side Project Needs a Blog (Yes, Even in 2026)"
date: "2026-07-09"
author: "Bharat Parsiya"
authorWebpage: "https://bnap.dev"
tags: ["blogging", "seo", "marketing", "indie-hacking"]
excerpt: "A landing page explains the pitch once. A blog compounds. The concrete, unsentimental case for shipping a blog next to your product."
featured: true
draft: false
---

Every week someone ships a beautiful landing page for a side project, posts it once, gets a spike of traffic, and then watches the graph flatline. The landing page did its job — it only had one job.

A blog is the part of your site that keeps working after launch day. Here's the unsentimental case for it.

## Search traffic compounds; launch traffic doesn't

A launch post on social media decays in days. A blog post that answers a question people actually search — "how to parse frontmatter in TypeScript", "astro vs next.js for a content site" — earns a trickle of visitors that continues for years, and every additional post widens the net.

The math is boring and it's the point: ten posts each bringing a handful of qualified visitors a day beats one viral day a quarter, because those visitors arrive *already looking for what you do*.

## AI assistants are the new search results page

An increasing share of "how do I…" questions never reach a search results page — they're answered by an AI assistant. Those assistants learned from, and increasingly cite, written content on the open web.

If your product has no prose explaining what it does and what problems it solves, there is nothing for an assistant to learn or recommend. A blog is how your project gets a voice in those answers. Standards like [llms.txt](https://llmstxt.org) make this explicit: a machine-readable index of your best content. (Yamblog [generates the blog section of it](/llms-txt/) for you.)

## Writing is the cheapest form of trust

Before anyone runs `npm install` on your package or enters a credit card, they want evidence that a real, competent person is behind it. A blog provides that evidence passively:

- **Changelogs with reasoning** show the project is alive and cared for.
- **Technical deep-dives** show you understand the problem domain.
- **Post-mortems and trade-off discussions** show honesty — which converts skeptics better than any feature grid.

None of this fits on a landing page, because a landing page has to be short. A blog is where the substance lives.

## Your blog is also your documentation's overflow valve

Some content is too narrative for docs and too substantial for a tweet: migration guides, "how we built X", performance investigations, comparisons with alternatives. Without a blog this content either bloats your docs or never gets written. With one, every support question you answer twice becomes a post you link forever.

## "But maintaining a blog is work"

The honest objection. Two answers:

**Lower the mechanical cost to near zero.** If publishing means "commit a markdown file," you'll publish. If it means logging into a CMS, fighting a rich-text editor, and re-uploading images, you won't. This is the entire reason [Yamblog](/getting-started/) exists — posts are files in your repo, validated at build time, with RSS, sitemap, search, and SEO metadata generated for free:

```md
---
title: "We shipped v2"
date: "2026-07-09"
tags: [changelog]
excerpt: "What changed and why."
---

The short version: ...
```

That's a published post. No admin panel involved.

**Lower the editorial bar.** A blog for a side project doesn't need essays. Release notes with context, a problem you debugged this week, a decision you made and why — 400 honest words beat 2,000 padded ones, for readers and for search engines alike.

## Start with three posts

If you're convinced, don't "plan a content strategy." Write these three:

1. **Why this project exists** — the problem that annoyed you into building it.
2. **Getting started in five minutes** — the happy path, with real code.
3. **One hard problem you solved** — the post only you could write.

Those three cover the three audiences that matter: people with your problem, people evaluating your solution, and people who'll respect the engineering. Everything after that is compounding.
