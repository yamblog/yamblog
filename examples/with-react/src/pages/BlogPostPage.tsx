import type { Post, AdjacentPosts } from '@yamblog/core';
import { MarkdownRenderer, PostLayout } from '@yamblog/react';

const prose: React.CSSProperties = {
  maxWidth: 640,
  margin: '0 auto',
  padding: '4rem 1rem',
  lineHeight: 1.75,
};

type Props = {
  post: Post;
  adjacent: AdjacentPosts;
  onBack: () => void;
  onNavigate: (slug: string) => void;
};

export function BlogPostPage({ post, adjacent, onBack, onNavigate }: Props) {
  // Adapt adjacent nav to SPA: intercept link clicks
  const adaptedAdjacent = {
    prev: adjacent.prev,
    next: adjacent.next,
  };

  return (
    <div style={prose}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', marginBottom: '2rem', padding: 0 }}
      >
        &larr; All posts
      </button>

      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>{post.title}</h1>
      <p style={{ fontSize: '0.875rem', color: '#71717a', marginBottom: '2rem' }}>
        {post.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        {' · '}{post.readingTime} min read{' · '}{post.author}
      </p>

      {post.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {post.tags.map(tag => (
            <span key={tag} style={{ fontSize: '0.75rem', background: '#f4f4f5', borderRadius: 4, padding: '0.2rem 0.5rem' }}>{tag}</span>
          ))}
        </div>
      )}

      <MarkdownRenderer content={post.content} />

      {(adjacent.prev || adjacent.next) && (
        <nav style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', fontSize: '0.875rem', color: '#71717a' }}>
          {adjacent.prev && (
            <button onClick={() => onNavigate(adjacent.prev!.slug)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}>
              &larr; {adjacent.prev.title}
            </button>
          )}
          {adjacent.next && (
            <button onClick={() => onNavigate(adjacent.next!.slug)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}>
              {adjacent.next.title} &rarr;
            </button>
          )}
        </nav>
      )}
    </div>
  );
}
