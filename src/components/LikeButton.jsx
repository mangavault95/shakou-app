import React from 'react';

export default function LikeButton({ user, postId }) {
  const [liked, setLiked] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function toggle() {
    setLoading(true);
    const action = liked ? 'unlike' : 'like';
    const res = await fetch('/api/social/like', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: user.id, post_id: postId, action }) });
    const json = await res.json();
    setLoading(false);
    if (json?.ok) setLiked(!liked);
  }

  return <button onClick={toggle} disabled={loading}>{liked ? '❤️' : '🤍'}</button>;
}
