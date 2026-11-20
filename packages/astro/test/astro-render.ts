// Test-only helper: compiles .astro components with Astro's compiler and
// renders them with the Container API, so the shipped components are
// exercised exactly as Astro would run them.
import { plugin } from 'bun';
import { readFileSync } from 'fs';
import { transform } from '@astrojs/compiler-rs';

let registered = false;

export function registerAstroLoader() {
  if (registered) return;
  registered = true;
  plugin({
    name: 'astro-components',
    setup(build) {
      build.onLoad({ filter: /\.astro$/ }, (args) => {
        const result = transform(readFileSync(args.path, 'utf8'), {
          filename: args.path,
          internalURL: 'astro/compiler-runtime',
        });
        // Astro's Vite plugin handles component metadata itself; the bare
        // runtime does not export createMetadata, so drop it here.
        const code = result.code
          .replace(/,\s*createMetadata as \$\$createMetadata/, '')
          .replace(/export const \$\$metadata = \$\$createMetadata\([\s\S]*?\n\}\);/, '');
        return { contents: code, loader: 'ts' };
      });
    },
  });
}

export async function renderComponent(path: string, props: Record<string, unknown>): Promise<string> {
  registerAstroLoader();
  const { experimental_AstroContainer } = await import('astro/container');
  const Component = (await import(path)).default;
  const container = await experimental_AstroContainer.create();
  return container.renderToString(Component, { props });
}
