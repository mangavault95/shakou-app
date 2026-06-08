// src/components/LikeButton.jsx
import React from 'react';
import { getAccessToken } from '../utils/auth';

export default function LikeButton({ user, postId, initialLiked, initialCount }) {
  const [liked, setLiked] = React.useState(Boolean(initialLiked));
  const [count, setCount] = React.useState(initialCount || 0);
  const [loading, setLoading] = React.useState(false);

  async function toggle() {
    if (!user) return alert('Accedi per mettere like.');
    if (loading) return;
    const wasLiked = liked;
    const action = wasLiked ? 'unlike' : 'like';

    // aggiornamento ottimistico
    setLiked(!wasLiked);
    setCount(c => c + (wasLiked ? -1 : 1));
    setLoading(true);

    try {
      const token = await getAccessToken();
      const res = await fetch('/api/social/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ post_id: postId, action })
      });
      const json = await res.json();
      if (json?.ok) {
        setLiked(json.liked);
        setCount(json.like_count);
      } else {
        // rollback
        setLiked(wasLiked);
        setCount(c => c + (wasLiked ? 1 : -1));
      }
    } catch (e) {
      setLiked(wasLiked);
      setCount(c => c + (wasLiked ? 1 : -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 8px', fontSize: 14 }}
    >
      {liked ? '❤️' : '🤍'} {count}
    </button>
  );
}
