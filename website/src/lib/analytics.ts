// Rybbit analytics, loaded in the <head> of every HTML page:
// - landing, blog index and blog posts through src/layouts/Landing.astro;
// - Starlight docs and the 404 page (a StarlightPage) through the Starlight
//   `head` option in astro.config.mjs.
//
// Renders as:
//   <script src="https://r.bnap.dev/api/script.js" data-site-id="fe5da80c2a10" defer></script>
//
// https://r.bnap.dev must stay allowed in script-src and connect-src of the
// CSP in public/_headers.

export const RYBBIT_SCRIPT_SRC = 'https://r.bnap.dev/api/script.js';
export const RYBBIT_SITE_ID = 'fe5da80c2a10';

export const rybbitScriptAttrs = {
  src: RYBBIT_SCRIPT_SRC,
  'data-site-id': RYBBIT_SITE_ID,
  defer: true,
} as const;
