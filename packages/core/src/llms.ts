import { z } from 'zod';
import { buildPostUrl } from './utils.js';
import { defaultSchema } from './types.js';
import type { Post, LlmsTxtOptions } from './types.js';

const DEFAULT_FILTER = (post: Post) => post.featured;

// Line breaks and other control characters would let a title or excerpt end
// the list item and inject arbitrary lines into llms.txt.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]+/g;

function oneLine(text: string): string {
  return text.replace(CONTROL_CHARS, ' ');
}

/** Link text: single line, with markdown link brackets (and `\`) escaped. */
function linkText(text: string): string {
  return oneLine(text).replace(/[\\[\]]/g, '\\$&');
}

/** Link destination: percent-encode characters that would end a markdown link. */
function linkUrl(url: string): string {
  return url.replace(/[\s()<>]/g, ch => `%${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
}

export function generateLlmsTxt<TSchema extends z.ZodObject<z.ZodRawShape> = typeof defaultSchema>(
  posts: Post<TSchema>[],
  options: LlmsTxtOptions<TSchema> & { siteUrl: string },
): string {
  const { sectionTitle = 'Blog' } = options;
  const siteUrl = options.siteUrl ?? '';
  const filter = options.filter ?? (DEFAULT_FILTER as unknown as (post: Post<TSchema>) => boolean);
  const published = options.includeDrafts ? posts : posts.filter(post => !(post as Post).draft);

  const filtered = published.filter(filter);
  const heading = `## ${oneLine(sectionTitle)}`;

  if (filtered.length === 0) {
    return `${heading}\n\n*(no posts)*`;
  }

  const items = filtered
    .map(entry => {
      const post = entry as Post;
      const url = linkUrl(buildPostUrl(siteUrl, options.basePath, post.slug));
      const title = linkText(String(post.title));
      return post.excerpt
        ? `- [${title}](${url}): ${oneLine(post.excerpt)}`
        : `- [${title}](${url})`;
    })
    .join('\n');

  return `${heading}\n\n${items}`;
}
