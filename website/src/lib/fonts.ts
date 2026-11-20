// Web fonts for both the landing pages (src/layouts/Landing.astro) and the
// Starlight docs (the `head` option in astro.config.mjs).
//
// They are requested from <head> with preconnect hints instead of a CSS
// @import inside the site stylesheet: an @import is only discovered after the
// render-blocking site CSS has downloaded, and its font files then come from a
// third origin with no warm connection. If the fonts are ever self-hosted,
// drop these links and the Google origins from the CSP in public/_headers.

export const GOOGLE_FONTS_CSS =
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Geist:wght@300;400;450;500;600&family=Geist+Mono:wght@400;500&display=swap';

export const fontLinks: Array<Record<string, string>> = [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
  { rel: 'stylesheet', href: GOOGLE_FONTS_CSS },
];
