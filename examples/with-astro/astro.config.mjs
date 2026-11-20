// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Your production URL. Feeds, the sitemap and JSON-LD use it for absolute links.
  site: process.env.SITE_URL ?? 'http://localhost:4321',
});
