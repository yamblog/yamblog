import type { Post } from '@yamblog/core';

type BreadcrumbItem = {
  name: string;
  url: string;
};

type MetadataOptions = {
  siteUrl: string;
  siteName?: string;
  /** URL path prefix where the blog is mounted. Default: '/blog' */
  basePath?: string;
};

/**
 * Generates a Next.js Metadata object for a blog post.
 */
export function generatePostMetadata(
  post: Post,
  { siteUrl, siteName, basePath = '/blog' }: MetadataOptions,
) {
  const url = `${siteUrl}${basePath}/${post.slug}`;
  const description = post.excerpt ?? post.title;

  return {
    title: post.title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description,
      publishedTime: post.date.toISOString(),
      authors: [post.author],
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
    },
  };
}

/**
 * Generates a JSON-LD BreadcrumbList schema for a page hierarchy.
 *
 * @example
 * const breadcrumbs = generateBreadcrumbJsonLd([
 *   { name: 'Home', url: 'https://example.com' },
 *   { name: 'Blog', url: 'https://example.com/blog' },
 *   { name: post.title, url: `https://example.com/blog/${post.slug}` },
 * ]);
 */
export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generates a JSON-LD Article schema object for a blog post.
 */
export function generateBlogJsonLd(
  post: Post,
  { siteUrl, basePath = '/blog' }: MetadataOptions,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    url: `${siteUrl}${basePath}/${post.slug}`,
    datePublished: post.date.toISOString(),
    author: {
      '@type': 'Person',
      name: post.author,
    },
    keywords: post.tags.join(', '),
  };
}
