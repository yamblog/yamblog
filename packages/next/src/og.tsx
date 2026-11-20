import { ImageResponse } from '@vercel/og';
import React from 'react';
import type { Blog } from '@yamblog/core';

type OgImageOptions = {
  width?: number;
  height?: number;
  siteName?: string;
  /** Override the default layout entirely */
  render?: (post: Awaited<ReturnType<Blog['getPostBySlug']>>) => React.ReactElement;
};

function isPostNotFound(err: unknown): boolean {
  return err instanceof Error && err.name === 'PostNotFoundError';
}

/**
 * Creates a Next.js route handler that generates OG images for blog posts.
 *
 * @example
 * // app/blog/[slug]/opengraph-image/route.tsx
 * import { createOgImageHandler } from '@yamblog/next';
 * import { blog } from '@/lib/blog';
 * export const GET = createOgImageHandler(blog, { siteName: 'My Blog' });
 *
 * // Reference it from the page metadata so it is actually used:
 * // generatePostMetadata(post, { siteUrl, ogImage: `/blog/${post.slug}/opengraph-image` })
 *
 * An unknown slug returns a plain `404 Not found` response.
 */
export function createOgImageHandler(blog: Blog, options: OgImageOptions = {}) {
  const { width = 1200, height = 630, siteName, render } = options;

  return async function GET(
    _request: Request,
    { params }: { params: Promise<{ slug: string }> },
  ) {
    const { slug } = await params;
    let post: Awaited<ReturnType<Blog['getPostBySlug']>>;
    try {
      post = await blog.getPostBySlug(slug);
    } catch (err) {
      if (isPostNotFound(err)) {
        return new Response('Not found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
      throw err;
    }

    const element = render
      ? render(post)
      : React.createElement(
          'div',
          {
            style: {
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column' as const,
              justifyContent: 'center',
              padding: '60px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              fontFamily: 'sans-serif',
            },
          },
          siteName &&
            React.createElement(
              'div',
              { style: { color: '#94a3b8', fontSize: '22px', marginBottom: '20px' } },
              siteName,
            ),
          React.createElement(
            'div',
            {
              style: {
                color: '#f8fafc',
                fontSize: post.title.length > 60 ? '44px' : '56px',
                fontWeight: 700,
                lineHeight: 1.2,
              },
            },
            post.title,
          ),
          post.excerpt &&
            React.createElement(
              'div',
              { style: { color: '#94a3b8', fontSize: '26px', marginTop: '24px', lineHeight: 1.5 } },
              post.excerpt,
            ),
          React.createElement(
            'div',
            { style: { color: '#64748b', fontSize: '20px', marginTop: '36px' } },
            `${post.author} · ${post.readingTime} min read`,
          ),
        );

    return new ImageResponse(element, { width, height });
  };
}
