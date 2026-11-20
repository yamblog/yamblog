/**
 * Formats a post date for display. Always uses UTC so that date-only
 * frontmatter (`date: 2024-01-15`, parsed as UTC midnight) shows the same day
 * on every server and in the browser, avoiding off-by-one days west of UTC and
 * hydration mismatches between server and client renders.
 */
export function formatPostDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
