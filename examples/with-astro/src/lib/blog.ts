import { defineBlog } from '@yamblog/core';

// import.meta.env.SITE is the `site` option from astro.config.mjs. Passing it
// keeps RSS, sitemap and JSON-LD links absolute.
export const blog = defineBlog('src/content/posts', import.meta.env.SITE);
