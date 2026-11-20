import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContent } from '../packages/core/src/validate.ts';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));

export const contentDirs = [
  'website/content/posts',
  'examples/with-astro/src/content/posts',
  'examples/with-next/content/posts',
  'examples/with-react/content/posts',
];

/**
 * Resolve the listed content directories against `root`. Throws when any is
 * missing, so a renamed or moved content directory fails validation instead
 * of being skipped silently.
 */
export function resolveContentDirs(root: string, dirs: readonly string[]): string[] {
  const missing = dirs.filter((dir) => !existsSync(resolve(root, dir)));
  if (missing.length > 0) {
    throw new Error(
      `Content director${missing.length === 1 ? 'y' : 'ies'} not found: ${missing.join(', ')}. ` +
        'Update the list in scripts/validate-content.ts if content moved.',
    );
  }
  return dirs.map((dir) => resolve(root, dir));
}

if (import.meta.main) {
  let absoluteDirs: string[];
  try {
    absoluteDirs = resolveContentDirs(rootDir, contentDirs);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  for (const [index, absoluteDir] of absoluteDirs.entries()) {
    console.log(`Validating content in ${contentDirs[index]}`);
    await validateContent({ contentDir: absoluteDir });
  }
}
