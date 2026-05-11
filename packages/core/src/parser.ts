import matter from 'gray-matter';
import { z } from 'zod';
import { defaultSchema } from './types.js';
import { readingTime, generateId } from './utils.js';
import type { Post } from './types.js';

/**
 * Parses a raw markdown string into a typed Post.
 * Uses gray-matter to split frontmatter from content,
 * then validates frontmatter against the provided Zod schema.
 */
export function parsePost(
  raw: string,
  slug: string,
  schema: z.ZodObject<z.ZodRawShape> = defaultSchema,
): Post {
  const { data, content } = matter(raw);

  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Invalid frontmatter in post "${slug}":\n${result.error.message}`,
    );
  }

  return {
    ...(result.data as ReturnType<typeof defaultSchema.parse>),
    id: generateId(slug),
    slug,
    content: content.trim(),
    readingTime: readingTime(content),
  } as Post;
}
