// Runtime guards for the built-in features that read default-schema fields
// (title, date, tags). A custom schema that does not extend defaultSchema is
// allowed — posts load and the slug-based methods work — but a method that
// needs one of these fields used to crash with a bare TypeError deep inside
// the engine. These guards run lazily, only in the methods that need the
// field, and turn that crash into an error that says what is missing.

type GuardedField = 'title' | 'date' | 'tags';

const FIELD_DESCRIPTIONS: Record<GuardedField, string> = {
  title: 'string `title`',
  date: 'Date `date`',
  tags: 'string[] `tags`',
};

function hasField(post: Record<string, unknown>, field: GuardedField): boolean {
  const value = post[field];
  switch (field) {
    case 'title':
      return typeof value === 'string';
    case 'date':
      return (
        value !== null &&
        typeof value === 'object' &&
        typeof (value as Date).getTime === 'function' &&
        typeof (value as Date).toISOString === 'function'
      );
    case 'tags':
      return Array.isArray(value);
  }
}

/** Builds the error thrown when a post lacks a field a method needs. */
export function missingFieldError(field: GuardedField, method: string, slug: unknown, hint?: string): Error {
  return new Error(
    `yamblog: ${method} needs every post to have a ${FIELD_DESCRIPTIONS[field]} field, ` +
      `but post "${String(slug)}" does not. This happens when the blog's schema does not ` +
      `extend defaultSchema — use defaultSchema.extend({ … }) to keep the built-in fields` +
      (hint ? `, or ${hint}.` : '.'),
  );
}

/**
 * Throws a descriptive error if any post lacks `field`.
 * Cheap (one property check per post) and only called by methods that would
 * otherwise throw a TypeError on the missing field.
 */
export function assertPostsHaveField(
  posts: readonly unknown[],
  field: GuardedField,
  method: string,
  hint?: string,
): void {
  for (const post of posts) {
    const p = post as Record<string, unknown>;
    if (!hasField(p, field)) throw missingFieldError(field, method, p.slug, hint);
  }
}

/** Single-post variant of {@link assertPostsHaveField}. */
export function assertPostHasField(post: unknown, field: GuardedField, method: string, hint?: string): void {
  const p = post as Record<string, unknown>;
  if (!hasField(p, field)) throw missingFieldError(field, method, p.slug, hint);
}
