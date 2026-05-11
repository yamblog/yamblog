/**
 * Build-time script: reads markdown posts and writes src/generated/posts.json.
 * Run via `npm run generate` before `vite dev` or `vite build`.
 */
import { createBlog } from '@yamblog/core';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentDir = join(__dirname, '../content/posts');
const outDir = join(__dirname, '../src/generated');
const outFile = join(outDir, 'posts.json');

const blog = createBlog({ contentDir });
const posts = await blog.getPosts();

// Dates must be serialised as ISO strings for JSON
const serialised = posts.map(p => ({ ...p, date: p.date.toISOString() }));

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(serialised, null, 2));
console.log(`Generated ${posts.length} posts -> ${outFile}`);
