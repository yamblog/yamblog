// `next/link.js` (not `next/link`): `next` has no exports map, so a plain Node
// ESM import of the extensionless specifier fails. The fully specified path
// resolves to the same file under Node, webpack and Turbopack, and Next's
// App Router aliases apply to it (they are keyed on the resolved `link.js`).
import Link from 'next/link.js';
import ReactMarkdown from 'react-markdown';
import type { Components, Options as MarkdownOptions } from 'react-markdown';
import type { AdjacentPosts, Post } from '@yamblog/core';
import { formatPostDate, serializeJsonLd } from './format.js';

type PluggableList = NonNullable<MarkdownOptions['remarkPlugins']>;

export interface BlogPostPageProps {
  post: Post;
  prev?: Post | null;
  next?: Post | null;
  /**
   * Previous/next posts as returned by `blog.getAdjacentPosts(slug)`.
   * Explicit `prev` / `next` props take precedence over this.
   */
  adjacent?: AdjacentPosts | null;
  /** Related posts to show at the bottom */
  related?: Post[];
  /** Base path for the blog. Default: "/blog" */
  basePath?: string;
  /**
   * JSON-LD object(s), e.g. from `generateBlogJsonLd(post, opts)`. Rendered as
   * a `<script type="application/ld+json">` with `<`, `>` and `&` escaped so
   * post content cannot break out of the script element.
   */
  jsonLd?: object | object[] | null;
  /** Extra remark plugins passed to react-markdown */
  remarkPlugins?: PluggableList;
  /** Extra rehype plugins passed to react-markdown */
  rehypePlugins?: PluggableList;
  /** Override react-markdown element renderers */
  components?: Components;
}

export function BlogPostPage({
  post,
  prev: prevProp,
  next: nextProp,
  adjacent,
  related,
  basePath = '/blog',
  jsonLd,
  remarkPlugins,
  rehypePlugins,
  components,
}: BlogPostPageProps) {
  const prev = prevProp !== undefined ? prevProp : adjacent?.prev;
  const next = nextProp !== undefined ? nextProp : adjacent?.next;

  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}
      <h1 className="text-3xl font-bold mb-3">{post.title}</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {formatPostDate(post.date)}
        {' · '}{post.readingTime} min read{' · '}{post.author}
      </p>

      <article className="prose dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={components}
        >
          {post.content}
        </ReactMarkdown>
      </article>

      {(prev || next) && (
        <div className="mt-12 flex justify-between text-sm text-zinc-500">
          {prev && (
            <Link href={`${basePath}/${prev.slug}`} className="hover:underline">
              &larr; {prev.title}
            </Link>
          )}
          {next && (
            <Link href={`${basePath}/${next.slug}`} className="ml-auto hover:underline">
              {next.title} &rarr;
            </Link>
          )}
        </div>
      )}

      {related && related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-lg font-semibold mb-4">Related posts</h2>
          <ul className="flex flex-col gap-4">
            {related.map((r) => (
              <li key={r.id}>
                <Link href={`${basePath}/${r.slug}`} className="font-medium hover:underline">
                  {r.title}
                </Link>
                {r.excerpt && (
                  <p className="text-sm text-zinc-500 mt-0.5">{r.excerpt}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
