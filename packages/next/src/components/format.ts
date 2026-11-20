/**
 * Formats a post date for display. Always uses UTC so that date-only
 * frontmatter (`date: 2024-01-15`, parsed as UTC midnight) shows the same day
 * on every server and in the browser, regardless of the process timezone.
 */
export function formatPostDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Serialises a value as JSON that is safe to embed inside
 * `<script type="application/ld+json">`: `<`, `>`, `&`, U+2028 and U+2029 are
 * escaped as `\uXXXX`, so a string such as `</script>` in a post title cannot
 * close the script element. The output is still valid JSON with the same value.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}
