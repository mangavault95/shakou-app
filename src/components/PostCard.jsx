// src/components/PostCard.jsx
import React from 'react';
import LikeButton from './LikeButton';
import { getAccessToken, displayName } from '../utils/auth';

export default function PostCard({ post, user }) {
  const [showComments, setShowComments] = React.useState(false);
  const [comments, setComments] = React.useState([]);
  const [loadingC, setLoadingC] = React.useState(false);
  const [text, setText] = React.useState('');
  const [count, setCount] = React.useState(post.comment_count || 0);

  async function loadComments() {
    setLoadingC(true);
    try {
      const res = await fetch(`/api/social/postComments?post_id=${encodeURIComponent(post.id)}`);
      const json = await res.json();
      setComments(json.comments || []);
    } catch (e) {
      console.error('loadComments failed', e);
    } finally {
      setLoadingC(false);
    }
  }

  function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) loadComments();
  }

  async function addComment(e) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || !user) return;
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/social/postComments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ post_id: post.id, body })
      });
      const json = await res.json();
      if (json?.ok) {
        setComments(c => [...c, json.comment]);
        setCount(n => n + 1);
        setText('');
      } else {
        alert('Errore: ' + (json?.error || 'unknown'));
      }
    } catch (e) {
      alert('Errore di rete');
    }
  }

  return (
    <article style={{ border: '1px solid #eee', borderRadius: 10, padding: 12, marginBottom: 12, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontWeight: 700 }}>{displayName(post.author)}</div>
        <div style={{ fontSize: 12, color: '#888' }}>
          {post.visibility === 'followers' ? '👥 ' : ''}{new Date(post.created_at).toLocaleString()}
        </div>
      </div>

      <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{post.content}</div>

      <div style={{ display: 'flex', gap: 12, marginTop: 10, alignItems: 'center' }}>
        <LikeButton user={user} postId={post.id} initialLiked={post.liked_by_me} initialCount={post.like_count} />
        <button onClick={toggleComments} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 14 }}>
          💬 {count}
        </button>
      </div>

      {showComments && (
        <div style={{ marginTop: 10, borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
          {loadingC && <div style={{ color: '#666', fontSize: 13 }}>Caricamento commenti…</div>}
          {!loadingC && comments.length === 0 && <div style={{ color: '#666', fontSize: 13 }}>Ancora nessun commento.</div>}
          {comments.map(c => (
            <div key={c.id} style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{displayName(c.author)}</span>
              <span style={{ marginLeft: 8, fontSize: 13, color: '#333' }}>{c.body}</span>
            </div>
          ))}
          {user && (
            <form onSubmit={addComment} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Scrivi un commento…"
                style={{ flex: 1, padding: 8, border: '1px solid #eee', borderRadius: 8 }}
              />
              <button type="submit" disabled={!text.trim()} style={{ padding: '8px 12px' }}>Invia</button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
