import type { Post } from '@yamblog/core';
import { useBlog, PostCard } from '@yamblog/react';

const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: 640, margin: '0 auto', padding: '4rem 1rem' },
  heading: { fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem' },
  searchRow: { display: 'flex', gap: '0.5rem', marginBottom: '2rem' },
  input: { flex: 1, border: '1px solid #d4d4d8', borderRadius: 6, padding: '0.4rem 0.75rem', fontSize: '0.875rem' },
  btn: { padding: '0.4rem 1rem', borderRadius: 6, border: 'none', background: '#18181b', color: '#fff', cursor: 'pointer', fontSize: '0.875rem' },
  clearBtn: { padding: '0.4rem 1rem', borderRadius: 6, border: '1px solid #d4d4d8', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem' },
  resultCount: { fontSize: '0.875rem', color: '#71717a', marginBottom: '1.5rem' },
  list: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '2.5rem' },
};

type Props = { posts: Post[]; onSelect: (slug: string) => void };

export function BlogListPage({ posts: initialPosts, onSelect }: Props) {
  const { posts, query, setQuery } = useBlog(initialPosts);

  return (
    <main style={styles.main}>
      <h1 style={styles.heading}>Blog</h1>

      <div style={styles.searchRow}>
        <input
          style={styles.input}
          placeholder="Search posts..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button style={styles.clearBtn} onClick={() => setQuery('')}>
            Clear
          </button>
        )}
      </div>

      {query && (
        <p style={styles.resultCount}>
          {posts.length} result{posts.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
        </p>
      )}

      {posts.length === 0 && <p style={{ color: '#71717a' }}>No posts found.</p>}

      <ul style={styles.list}>
        {posts.map(post => (
          <li key={post.id}>
            {/* PostCard renders an <a> — we intercept clicks for SPA nav */}
            <div
              onClick={e => { e.preventDefault(); onSelect(post.slug); }}
              style={{ cursor: 'pointer' }}
            >
              <PostCard post={post} />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
