// Guards the published dist of @yamblog/next (run after `tsc` in `build`).
//
// 1. dist must be per-file ESM that imports react / next / react-markdown from
//    the consumer's node_modules: no inlined third-party code, no React
//    development build, no `jsxDEV` (undefined in production React).
// 2. Every `exports` entry must point at a file that exists.
// 3. The built components must render with the host React through
//    react-dom/server under plain Node (this is what broke when the build
//    bundled its own copy of React and next/link).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const failures = [];
const fail = (msg) => failures.push(msg);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

if (!existsSync(dist)) {
  console.error('check-dist: dist/ does not exist; run the build first');
  process.exit(1);
}

const jsFiles = walk(dist).filter((f) => f.endsWith('.js'));
const forbidden = [
  ['node_modules/', 'inlined node_modules code'],
  ['react.development', 'inlined React development build'],
  ['react.production', 'inlined React production build'],
  ['jsx-dev-runtime', 'react/jsx-dev-runtime import'],
  ['jsxDEV', 'jsxDEV call (undefined in production React)'],
  ['next/dist/', 'inlined or deep-imported next internals'],
  ['__commonJS', 'bundler CommonJS wrapper'],
];
for (const file of jsFiles) {
  const code = readFileSync(file, 'utf8');
  for (const [needle, why] of forbidden) {
    if (code.includes(needle)) fail(`${file}: contains "${needle}" (${why})`);
  }
  if (code.length > 50_000) fail(`${file}: ${code.length} bytes, looks bundled`);
}

for (const name of ['BlogListPage.js', 'BlogPostPage.js']) {
  const file = join(dist, 'components', name);
  if (!existsSync(file)) {
    fail(`components/${name}: missing (dist is not per-file ESM)`);
    continue;
  }
  const code = readFileSync(file, 'utf8');
  if (!code.includes('from "react/jsx-runtime"')) fail(`components/${name}: does not import react/jsx-runtime`);
  if (!code.includes("from 'next/link.js'")) fail(`components/${name}: does not import next/link.js`);
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const [subpath, target] of Object.entries(pkg.exports)) {
  const targets = typeof target === 'string' ? [target] : Object.values(target);
  for (const t of targets) {
    if (!existsSync(join(root, t))) fail(`exports["${subpath}"] -> ${t} does not exist`);
  }
}

function report() {
  if (failures.length > 0) {
    console.error(`check-dist: ${failures.length} problem(s) in @yamblog/next dist:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
}
report();

// Render smoke test with the host React.
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const components = await import(pathToFileURL(join(dist, 'components', 'index.js')).href);
// The root entry is not imported here: it re-exports og.js, and @vercel/og 1.x
// only loads through a bundler (as in Next.js), not under plain Node.
const rootCode = readFileSync(join(dist, 'index.js'), 'utf8');
for (const name of ['BlogListPage', 'BlogPostPage', 'generatePostMetadata', 'createOgImageHandler', 'createRssHandler', 'createSitemapExport', 'createStaticParams', 'generateBlogJsonLd', 'generateBreadcrumbJsonLd']) {
  if (!rootCode.includes(name)) fail(`dist/index.js no longer exports ${name}`);
}

const post = (slug, title) => ({
  id: `blog-${slug}`,
  slug,
  title,
  date: new Date('2024-01-15'),
  excerpt: `About ${title}`,
  category: 'General',
  tags: ['a'],
  author: 'Jane',
  featured: false,
  draft: false,
  content: `# ${title}\n\nBody text.`,
  readingTime: 1,
});

try {
  const list = renderToStaticMarkup(
    createElement(components.BlogListPage, { posts: [post('one', 'One'), post('two', 'Two')] }),
  );
  if (!list.includes('href="/blog/one"') || !list.includes('January 15, 2024')) {
    fail(`BlogListPage rendered unexpected markup: ${list.slice(0, 300)}`);
  }
  const page = renderToStaticMarkup(
    createElement(components.BlogPostPage, {
      post: post('two', 'Two'),
      prev: post('one', 'One'),
      next: post('three', 'Three'),
      related: [post('four', 'Four')],
      jsonLd: { headline: '</script><script>alert(1)</script>' },
    }),
  );
  for (const needle of ['href="/blog/one"', 'href="/blog/three"', 'href="/blog/four"', 'Body text.']) {
    if (!page.includes(needle)) fail(`BlogPostPage markup is missing ${needle}`);
  }
  if (page.includes('</script><script>alert(1)')) fail('BlogPostPage JSON-LD is not escaped');
} catch (err) {
  fail(`rendering the built components threw: ${err && err.stack ? err.stack : err}`);
}

report();
console.log(`check-dist: OK (${jsFiles.length} files, components render under Node ${process.version})`);
