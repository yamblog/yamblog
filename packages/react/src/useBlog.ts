import { useState, useMemo, useDeferredValue } from 'react';
import type { Post } from '@yamblog/core';
import { clientSearch } from './search.js';
import type { SearchablePost } from './search.js';

export type UseBlogResult<T extends SearchablePost = Post> = {
  /** Posts matching the current query (all posts when query is empty) */
  posts: T[];
  /** Current search query */
  query: string;
  /** Update the search query — triggers client-side filtering */
  setQuery: (q: string) => void;
};

/**
 * Hook that manages client-side search and filtering over pre-fetched posts.
 *
 * Filtering uses a deferred copy of the query (`useDeferredValue`), so typing
 * stays responsive on large lists; `query` itself updates immediately.
 *
 * Accepts full posts or the slimmer entries from `blog.generateSearchIndex()`.
 *
 * @example
 * // Fetch posts server-side (RSC, loader, getServerSideProps, etc.)
 * // and pass them in:
 * function BlogPage({ initialPosts }: { initialPosts: Post[] }) {
 *   const { posts, query, setQuery } = useBlog(initialPosts);
 *   return <PostList posts={posts} />;
 * }
 */
export function useBlog<T extends SearchablePost = Post>(initialPosts: T[]): UseBlogResult<T> {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const posts = useMemo(
    () => clientSearch(initialPosts, deferredQuery),
    [initialPosts, deferredQuery],
  );

  return { posts, query, setQuery };
}
