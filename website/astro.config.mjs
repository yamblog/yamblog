// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  adapter: cloudflare({
    prerenderEnvironment: 'node',
  }),
  integrations: [
    starlight({
      title: 'YAMBlog',
      description: 'Markdown-first blog engine for Next.js, Astro, and React.',
      customCss: ['./src/styles/starlight.css'],
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
            { label: 'AI Agent Authoring', slug: 'ai-agent-authoring' },
            { label: 'Prompt for LLMs', slug: 'prompt-for-llms' },
            { label: 'llms.txt', slug: 'llms-txt' },
          ],
        },
      ],
    }),
  ],
});
