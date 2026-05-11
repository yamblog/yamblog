import type { Post, AdjacentPosts } from '@yamblog/core';

export type PostLayoutProps = {
  post: Post;
  /** Rendered content (e.g. <MarkdownRenderer content={post.content} />) */
  children: React.ReactNode;
  adjacent?: AdjacentPosts;
  /** Base path for navigation links. Default: "/blog" */
  basePath?: string;
};

export function PostLayout({ post, children, adjacent, basePath = '/blog' }: PostLayoutProps) {
  const formattedDate = post.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main>
      <a href={basePath}>&larr; All posts</a>

      <h1>{post.title}</h1>
      <p>
        {formattedDate} &middot; {post.readingTime} min read &middot; {post.author}
      </p>

      {post.tags.length > 0 && (
        <div>
          {post.tags.map(tag => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}

      <article>{children}</article>

      {adjacent && (
        <nav>
          {adjacent.prev && (
            <a href={`${basePath}/${adjacent.prev.slug}`}>
              &larr; {adjacent.prev.title}
            </a>
          )}
          {adjacent.next && (
            <a href={`${basePath}/${adjacent.next.slug}`}>
              {adjacent.next.title} &rarr;
            </a>
          )}
        </nav>
      )}
    </main>
  );
}
