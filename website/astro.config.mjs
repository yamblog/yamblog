// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import cloudflare from '@astrojs/cloudflare';
import { fontLinks } from './src/lib/fonts.ts';
import { rybbitScriptAttrs } from './src/lib/analytics.ts';

export default defineConfig({
  site: 'https://yamblog.dev',
  adapter: cloudflare({
    prerenderEnvironment: 'node',
    imageService: 'passthrough',
  }),
  session: {
    driver: { entrypoint: 'unstorage/drivers/null' },
  },
  integrations: [
    starlight({
      title: 'YAMBlog',
      description: 'Markdown-first blog engine for Next.js, Astro, and React.',
      customCss: ['./src/styles/starlight.css'],
      head: [
        ...fontLinks.map((attrs) => ({ tag: /** @type {const} */ ('link'), attrs })),
        // Rybbit analytics (src/lib/analytics.ts); covers every docs page and the 404.
        { tag: 'script', attrs: { ...rybbitScriptAttrs } },
      ],
      disable404Route: true,
      components: {
        SiteTitle: './src/components/starlight/SiteTitle.astro',
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/yamblog/yamblog' },
      ],
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'Getting Started', slug: 'getting-started' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Next.js', slug: 'recipes/nextjs' },
            { label: 'Astro', slug: 'recipes/astro' },
            { label: 'React', slug: 'recipes/react' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Architecture', slug: 'architecture' },
            { label: 'Extensibility', slug: 'extensibility' },
            { label: 'Security', slug: 'security' },
            { label: 'AI Agent Authoring', slug: 'ai-agent-authoring' },
            { label: 'Prompt for LLMs', slug: 'prompt-for-llms' },
            { label: 'llms.txt', slug: 'llms-txt' },
          ],
        },
      ],
    }),
  ],
});
