import type { Post } from '@yamblog/core';

export type PostCardProps = {
  post: Post;
  /** Base path for the post link. Default: "/blog" */
  basePath?: string;
};

export function PostCard({ post, basePath = '/blog' }: PostCardProps) {
  const formattedDate = post.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article>
      <a href={`${basePath}/${post.slug}`}>
        <h2>{post.title}</h2>
      </a>
      <p>
        {formattedDate} &middot; {post.readingTime} min read &middot; {post.author}
      </p>
      {post.excerpt && <p>{post.excerpt}</p>}
      {post.tags.length > 0 && (
        <div>
          {post.tags.map(tag => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}
    </article>
  );
}
