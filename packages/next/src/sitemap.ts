import { buildPostUrl } from '@yamblog/core';
import type { Blog, SitemapOptions } from '@yamblog/core';

type SitemapEntry = {
  url: string;
  lastModified?: Date;
};

export function createSitemapExport(
  blog: Blog,
  options: SitemapOptions = {},
): () => Promise<SitemapEntry[]> {
  return async function sitemap(): Promise<SitemapEntry[]> {
    const siteUrl = options.siteUrl ?? blog.siteUrl;
    const basePath = options.basePath ?? blog.basePath;
    const posts = await blog.getPosts();
    const published = options.includeDrafts ? posts : posts.filter(post => !post.draft);
    return published.map(post => ({
      url: buildPostUrl(siteUrl, basePath, post.slug),
      lastModified: post.date,
    }));
  };
}
