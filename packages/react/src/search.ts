// Import from the fs-free `/search` subpath: this module is bundled for the
// browser, and the package root's module graph reaches node:fs via the loader.
import { searchPosts } from '@yamblog/core/search';
import type { Post } from '@yamblog/core';

/**
 * Client-side full-text search over pre-fetched posts.
 * Delegates to core's searchPosts (title 3pts > excerpt 2pts > tags 1pt >
 * content 1pt); an empty query returns all posts instead of none.
 */
export function clientSearch(posts: Post[], query: string): Post[] {
  if (!query.trim()) return posts;
  return searchPosts(posts, query);
}
