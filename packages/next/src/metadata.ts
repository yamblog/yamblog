import { buildPostUrl, normalizeSiteUrl } from '@yamblog/core';
import type { Post } from '@yamblog/core';

type BreadcrumbItem = {
  name: string;
  url: string;
};

/** An image for `openGraph.images` / `twitter.images`. */
export type PostMetadataImage =
  | string
  | {
      url: string;
      width?: number;
      height?: number;
      alt?: string;
    };

export type MetadataOptions = {
  /**
   * Absolute origin of the site, e.g. `https://example.com`. Used to build the
   * canonical URL. When omitted, URLs are root-relative (`/blog/my-post`) and
   * Next.js resolves them against `metadataBase` from your root layout.
   */
  siteUrl?: string;
  siteName?: string;
  /**
   * URL path prefix where the blog is mounted. Pass `blog.basePath` when the
   * blog is configured with a custom base path so canonical and JSON-LD URLs
   * match the RSS/sitemap links. Default: '/blog'
   */
  basePath?: string;
  /**
   * Opt-in: social preview image(s) for `openGraph.images` and
   * `twitter.images`, e.g. the URL of a `createOgImageHandler` route
   * (`/blog/${post.slug}/opengraph-image`). Root-relative paths are resolved
   * against `siteUrl` when it is set. Default: no images (unchanged output).
   */
  ogImage?: PostMetadataImage | PostMetadataImage[];
  /**
   * Opt-in: use the post's `coverImage` frontmatter as the social image when
   * `ogImage` is not given. Default: false.
   */
  useCoverImage?: boolean;
};

type ResolvedImage = { url: string; width?: number; height?: number; alt?: string };

function resolveUrl(siteUrl: string | undefined, url: string): string {
  if (siteUrl && url.startsWith('/') && !url.startsWith('//')) {
    return `${normalizeSiteUrl(siteUrl)}${url}`;
  }
  return url;
}

function resolveImages(
  post: Post,
  { siteUrl, ogImage, useCoverImage }: MetadataOptions,
): ResolvedImage[] | undefined {
  const source = ogImage ?? (useCoverImage && post.coverImage ? post.coverImage : undefined);
  if (source === undefined) return undefined;
  const list = Array.isArray(source) ? source : [source];
  if (list.length === 0) return undefined;
  return list.map(image => {
    const resolved: ResolvedImage = typeof image === 'string' ? { url: image } : { ...image };
    resolved.url = resolveUrl(siteUrl, resolved.url);
    if (resolved.alt === undefined) resolved.alt = post.title;
    return resolved;
  });
}

/**
 * Generates a Next.js Metadata object for a blog post.
 */
export function generatePostMetadata(
  post: Post,
  options: MetadataOptions = {},
) {
  const { siteUrl, siteName, basePath } = options;
  const url = buildPostUrl(siteUrl ?? '', basePath, post.slug);
  const description = post.excerpt ?? post.title;
  const images = resolveImages(post, options);

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
      ...(images ? { images } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      ...(images ? { images } : {}),
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
  { siteUrl, basePath }: MetadataOptions = {},
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    url: buildPostUrl(siteUrl ?? '', basePath, post.slug),
    datePublished: post.date.toISOString(),
    author: {
      '@type': 'Person',
      name: post.author,
    },
    keywords: post.tags.join(', '),
  };
}
