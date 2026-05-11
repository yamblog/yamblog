import { useState, useMemo } from 'react';
import type { Post } from '@yamblog/core';
import { clientSearch } from './search.js';

export type UseBlogResult = {
  /** Posts matching the current query (all posts when query is empty) */
  posts: Post[];
  /** Current search query */
  query: string;
  /** Update the search query — triggers client-side filtering */
  setQuery: (q: string) => void;
};

/**
 * Hook that manages client-side search and filtering over pre-fetched posts.
 *
 * @example
 * // Fetch posts server-side (RSC, loader, getServerSideProps, etc.)
 * // and pass them in:
 * function BlogPage({ initialPosts }: { initialPosts: Post[] }) {
 *   const { posts, query, setQuery } = useBlog(initialPosts);
 *   return <PostList posts={posts} />;
 * }
 */
export function useBlog(initialPosts: Post[]): UseBlogResult {
  const [query, setQuery] = useState('');

  const posts = useMemo(
    () => clientSearch(initialPosts, query),
    [initialPosts, query],
  );

  return { posts, query, setQuery };
}
