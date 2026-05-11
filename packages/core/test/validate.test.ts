import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { createBlog } from '../src/blog';
import { validateContent } from '../src/validate';

const fixturesDir = join(import.meta.dir, 'fixtures');

describe('validateContent', () => {
  it('returns parsed posts when content is valid', async () => {
    const posts = await validateContent({ contentDir: fixturesDir });
    expect(posts.length).toBe(3);
    expect(posts.some((post) => post.draft)).toBe(true);
  });

  it('throws when the content directory is missing', async () => {
    await expect(
      validateContent({ contentDir: join(fixturesDir, 'missing') }),
    ).rejects.toThrow('content directory not found');
  });

  it('throws on invalid frontmatter', async () => {
    await expect(
      validateContent({ contentDir: join(import.meta.dir, 'invalid-frontmatter-dir') }),
    ).rejects.toThrow('Invalid frontmatter');
  });

  it('throws on duplicate slugs after slugify', async () => {
    await expect(
      validateContent({ contentDir: join(import.meta.dir, 'duplicate-slug-dir') }),
    ).rejects.toThrow('Duplicate post slug');
  });

  it('is available on the blog instance', async () => {
    const blog = createBlog({ contentDir: fixturesDir });
    const posts = await blog.validateContent();
    expect(posts.length).toBe(3);
  });
});
