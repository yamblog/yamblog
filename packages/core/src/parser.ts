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
export function parsePost<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  raw: string,
  slug: string,
  schema?: TSchema,
): Post<TSchema> {
  const s = schema ?? defaultSchema;
  const { data, content } = matter(raw);

  const result = s.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Invalid frontmatter in post "${slug}":\n${result.error.message}`,
    );
  }

  return {
    ...(result.data as z.infer<TSchema>),
    id: generateId(slug),
    slug,
    content: content.trim(),
    readingTime: readingTime(content),
  } as Post<TSchema>;
}
