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
    return posts.map(post => ({
      url: `${siteUrl}${basePath}/${post.slug}`,
      lastModified: post.date,
    }));
  };
}
