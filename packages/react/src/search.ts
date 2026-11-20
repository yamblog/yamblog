// Import from the fs-free `/search` subpath: this module is bundled for the
// browser, and the package root's module graph reaches node:fs via the loader.
import { searchPosts } from '@yamblog/core/search';
import type { Post } from '@yamblog/core';

/**
 * The fields client search looks at. Satisfied by a full `Post` and by the
 * slimmer `SearchIndexEntry` from `blog.generateSearchIndex()`, which has no
 * `content` (content is then simply not searched).
 */
export type SearchablePost = {
  title: string;
  excerpt?: string | null;
  tags: string[];
  content?: string | null;
};

/**
 * Client-side full-text search over pre-fetched posts.
 * Delegates to core's searchPosts (title 3pts > excerpt 2pts > tags 1pt >
 * content 1pt); an empty query returns all posts instead of none.
 *
 * Accepts full posts or search-index entries; prefer the search index in the
 * browser so post bodies are not shipped to the client. Returns the same
 * objects that were passed in.
 */
export function clientSearch<T extends SearchablePost = Post>(posts: T[], query: string): T[] {
  if (!query.trim()) return posts;

  // core's searchPosts reads `content` unconditionally, so give entries without
  // a body an empty one and map the results back to the caller's objects.
  const originals = new Map<object, T>();
  const searchable = posts.map(p => {
    if (typeof p.content === 'string') return p;
    const copy = { ...p, content: '' };
    originals.set(copy, p);
    return copy;
  });

  const results = searchPosts(searchable as unknown as Post[], query) as unknown as object[];
  return results.map(r => originals.get(r) ?? (r as T));
}
