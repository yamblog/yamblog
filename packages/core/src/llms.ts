import { buildPostUrl } from './utils.js';
import type { Post, LlmsTxtOptions } from './types.js';

const DEFAULT_FILTER = (post: Post) => post.featured;

export function generateLlmsTxt(
  posts: Post[],
  options: LlmsTxtOptions & { siteUrl: string }
): string {
  const { sectionTitle = 'Blog', siteUrl, filter = DEFAULT_FILTER } = options;
  const published = options.includeDrafts ? posts : posts.filter(post => !post.draft);

  const filtered = published.filter(filter);
  const heading = `## ${sectionTitle}`;

  if (filtered.length === 0) {
    return `${heading}\n\n*(no posts)*`;
  }

  const items = filtered
    .map(post => {
      const url = buildPostUrl(siteUrl, options.basePath, post.slug);
      return post.excerpt
        ? `- [${post.title}](${url}): ${post.excerpt}`
        : `- [${post.title}](${url})`;
    })
    .join('\n');

  return `${heading}\n\n${items}`;
}
