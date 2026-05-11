import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContent } from '../packages/core/src/validate.ts';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));

const contentDirs = [
  'website/content/posts',
  'examples/with-astro/src/content/posts',
  'examples/with-next/content/posts',
  'examples/with-react/content/posts',
];

for (const relativeDir of contentDirs) {
  const absoluteDir = resolve(rootDir, relativeDir);

  if (!existsSync(absoluteDir)) {
    continue;
  }

  console.log(`Validating content in ${relativeDir}`);
  await validateContent({ contentDir: absoluteDir });
}
