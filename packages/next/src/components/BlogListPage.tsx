import Link from 'next/link';
import type { Post } from '@yamblog/core';

interface Props {
  posts: Post[];
  /** Current search query — controls result count label and Clear button */
  query?: string;
  /** Base path for the blog. Default: "/blog" */
  basePath?: string;
}

export function BlogListPage({ posts, query, basePath = '/blog' }: Props) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">Blog</h1>

      <form method="GET" className="mb-10 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search posts..."
          className="flex-1 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-1.5 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        <button
          type="submit"
          className="px-3 py-1.5 text-sm rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-80"
        >
          Search
        </button>
        {query && (
          <a
            href={basePath}
            className="px-3 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-700 hover:opacity-80"
          >
            Clear
          </a>
        )}
      </form>

      {query && (
        <p className="text-sm text-zinc-500 mb-6">
          {posts.length} result{posts.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
        </p>
      )}

      {posts.length === 0 && (
        <p className="text-zinc-500 text-sm">No posts found.</p>
      )}

      <ul className="flex flex-col gap-10">
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`${basePath}/${post.slug}`} className="group">
              <h2 className="text-xl font-semibold group-hover:underline">
                {post.title}
              </h2>
            </Link>
            <p className="text-sm text-zinc-500 mt-1">
              {post.date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {' \u00b7 '}{post.readingTime} min read{' \u00b7 '}{post.author}
            </p>
            {post.excerpt && (
              <p className="mt-2 text-zinc-700 dark:text-zinc-300">{post.excerpt}</p>
            )}
            <div className="mt-2 flex gap-2 flex-wrap">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
