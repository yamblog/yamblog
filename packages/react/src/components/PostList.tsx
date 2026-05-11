import type { Post } from '@yamblog/core';
import { PostCard } from './PostCard.js';

export type PostListProps = {
  posts: Post[];
  /** Base path for post links. Default: "/blog" */
  basePath?: string;
  /** Rendered when posts is empty */
  emptyState?: React.ReactNode;
};

export function PostList({ posts, basePath, emptyState }: PostListProps) {
  if (posts.length === 0) {
    return <>{emptyState ?? <p>No posts found.</p>}</>;
  }

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>
          <PostCard post={post} basePath={basePath} />
        </li>
      ))}
    </ul>
  );
}
