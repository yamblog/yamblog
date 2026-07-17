// Published package versions, read from the workspace manifests at build
// time. Changesets bumps these on every release, so the site always shows
// the latest shipped versions without manual edits.
import core from '../../../packages/core/package.json';
import next from '../../../packages/next/package.json';
import astro from '../../../packages/astro/package.json';
import react from '../../../packages/react/package.json';
import remark from '../../../packages/remark/package.json';

export const versions = {
  core: core.version,
  next: next.version,
  astro: astro.version,
  react: react.version,
  remark: remark.version,
} as const;
