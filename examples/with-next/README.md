# Yamblog + Next.js example

A Next.js App Router blog built with [`@yamblog/core`](../../packages/core) and
[`@yamblog/next`](../../packages/next). Posts are markdown files in
[`content/posts`](content/posts).

## Run it

From the repository root:

```bash
bun install
bun run build          # builds the yamblog packages this example imports
bun run example:next   # or: cd examples/with-next && bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What is where

| File | What it shows |
| --- | --- |
| `src/lib/blog.ts` | One shared `defineBlog()` instance |
| `src/app/page.tsx` | Featured posts on the home page |
| `src/app/blog/page.tsx` | Listing with server-side search (`?q=`) |
| `src/app/blog/[slug]/page.tsx` | Post page: `findPostBySlug` + `notFound()`, metadata, escaped JSON-LD, prev/next links |
| `src/app/blog/[slug]/opengraph-image/route.ts` | Generated OG image, linked from the metadata via `ogImage` |
| `src/app/feed.xml/route.ts` | RSS feed |
| `src/app/sitemap.ts` | Sitemap |

## Site URL

Feeds, the sitemap, canonical URLs and JSON-LD need an absolute site URL. Set
`NEXT_PUBLIC_SITE_URL` (for example `https://example.com`). On Vercel, production
deployments otherwise use the project's production domain and preview deployments
their own deployment URL. Locally, without it, links are relative and the layout
falls back to `http://localhost:3000` for `metadataBase`.

## Content trust

Post bodies are rendered with `react-markdown`, which shows raw HTML as text, and the
JSON-LD is written with `serializeJsonLd` so a `</script>` in a title cannot break out
of the script tag. See [Security and content trust](../../docs/security.md) before
adding `rehype-raw` or rendering posts from authors you do not trust.
