import matter from 'gray-matter';
import { z } from 'zod';
import { defaultSchema } from './types.js';
import { readingTime, generateId } from './utils.js';
import type { Post } from './types.js';

function rejectCodeFrontmatter(): never {
  throw new Error(
    'executable front matter (---js / ---javascript / ---coffee) is not supported; use YAML or JSON front matter',
  );
}

// gray-matter ships a `javascript` engine (alias `js`) that eval()s the front
// matter block, so a markdown file starting with `---js` would run arbitrary
// code in the build or server process. Override every code-executing engine
// name (gray-matter matches them case-insensitively through its alias table).
// Passing an options object also bypasses gray-matter's module-global cache,
// which otherwise keeps a copy of every file ever parsed.
const MATTER_OPTIONS = {
  engines: {
    javascript: rejectCodeFrontmatter,
    js: rejectCodeFrontmatter,
    coffee: rejectCodeFrontmatter,
    coffeescript: rejectCodeFrontmatter,
    cson: rejectCodeFrontmatter,
  },
};

/** Error with `cause` set (ES2020 lib has no ErrorOptions). */
export function errorWithCause(message: string, cause: unknown): Error {
  const err = new Error(message);
  Object.defineProperty(err, 'cause', { value: cause, writable: true, configurable: true, enumerable: false });
  return err;
}

function describeSource(slug: string, filename?: string): string {
  return filename ? `post "${slug}" (${filename})` : `post "${slug}"`;
}

/** True for a ZodDate (zod 3 or zod 4), including z.coerce.date(). */
function isZodDate(field: unknown): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (field as any)?._def;
  return def?.typeName === 'ZodDate' || def?.type === 'date';
}

/**
 * Numeric `date` values below this (in ms, i.e. before 1973-03-03) are almost
 * always a mistake such as `date: 2024`, not a real timestamp.
 */
const MIN_NUMERIC_DATE = 1e11;

/**
 * Parses a raw markdown string into a typed Post.
 * Uses gray-matter to split frontmatter from content,
 * then validates frontmatter against the provided Zod schema.
 *
 * `filename` is only used to make error messages point at the file.
 */
export function parsePost<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  raw: string,
  slug: string,
  schema?: TSchema,
  filename?: string,
): Post<TSchema> {
  const s = schema ?? defaultSchema;

  let parsed: { data: Record<string, unknown>; content: string };
  try {
    parsed = matter(raw, MATTER_OPTIONS);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw errorWithCause(
      `yamblog: failed to parse front matter in ${describeSource(slug, filename)}: ${message}`,
      err,
    );
  }
  const { data, content } = parsed;

  // z.coerce.date() turns YAML null (`date:` left empty), booleans and small
  // numbers (a bare `date: 2024` is 2024 ms after the epoch) into 1970 dates
  // without complaint. Reject those explicitly for date fields. String dates
  // are parsed exactly as before (timezone-less date-times stay local time).
  const input: Record<string, unknown> = data;
  if ('date' in data && isZodDate((s.shape as Record<string, unknown>).date)) {
    const dateValue = data.date;
    const invalid =
      dateValue === null ||
      typeof dateValue === 'boolean' ||
      (typeof dateValue === 'number' && Math.abs(dateValue) < MIN_NUMERIC_DATE);
    if (invalid) {
      const got =
        dateValue === null
          ? 'an empty value'
          : typeof dateValue === 'number'
            ? `the number ${dateValue} (write a full date such as ${dateValue >= 1000 && dateValue <= 9999 ? `${dateValue}-01-01` : '2024-03-01'})`
            : String(dateValue);
      throw new Error(
        `Invalid frontmatter in ${describeSource(slug, filename)}:\n` +
          `"date" must be a date such as 2024-03-01, got ${got}`,
      );
    }
  }

  const result = s.safeParse(input);
  if (!result.success) {
    throw new Error(
      `Invalid frontmatter in ${describeSource(slug, filename)}:\n${result.error.message}`,
    );
  }

  const fields = result.data as Record<string, unknown>;
  // A schema that does not declare `draft` strips the key, which used to make
  // `draft: true` posts public. Honour a literal `draft: true` from the front
  // matter in that case; when the schema declares `draft`, its output wins.
  const draftFromRaw = !('draft' in fields) && data.draft === true ? { draft: true } : {};

  return {
    ...(result.data as z.infer<TSchema>),
    ...draftFromRaw,
    id: generateId(slug),
    slug,
    content: content.trim(),
    readingTime: readingTime(content),
  } as Post<TSchema>;
}
