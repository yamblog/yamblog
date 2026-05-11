import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { Post } from '@yamblog/core';

interface Props {
  post: Post;
  prev?: Post | null;
  next?: Post | null;
  /** Related posts to show at the bottom */
  related?: Post[];
  /** Base path for the blog. Default: "/blog" */
  basePath?: string;
}

export function BlogPostPage({ post, prev, next, related, basePath = '/blog' }: Props) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-3">{post.title}</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {post.date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        {' \u00b7 '}{post.readingTime} min read{' \u00b7 '}{post.author}
      </p>

      <article className="prose dark:prose-invert max-w-none">
        <ReactMarkdown>{post.content}</ReactMarkdown>
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
