// src/components/PostComposer.jsx
import React from 'react';
import { getAccessToken } from '../utils/auth';

export default function PostComposer({ user, onPosted }) {
  const [text, setText] = React.useState('');
  const [visibility, setVisibility] = React.useState('public');
  const [loading, setLoading] = React.useState(false);

  if (!user) {
    return <div style={{ color: '#666', marginBottom: 16 }}>Accedi per pubblicare un post.</div>;
  }

  async function submit(e) {
    e?.preventDefault();
    const content = text.trim();
    if (!content) return;
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/social/createPost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, visibility })
      });
      const json = await res.json();
      if (json?.ok) {
        setText('');
        setVisibility('public');
        onPosted && onPosted(json.post);
      } else {
        alert('Errore: ' + (json?.error || 'unknown'));
      }
    } catch (err) {
      console.error('createPost failed', err);
      alert('Errore di rete');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginBottom: 16, border: '1px solid #eee', borderRadius: 10, padding: 12, background: '#fff' }}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="A cosa stai pensando?"
        style={{ width: '100%', minHeight: 80, padding: 8, border: '1px solid #eee', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <select value={visibility} onChange={e => setVisibility(e.target.value)} style={{ padding: 6, borderRadius: 6 }}>
          <option value="public">🌍 Pubblico</option>
          <option value="followers">👥 Solo follower</option>
        </select>
        <button type="submit" disabled={loading || !text.trim()} style={{ padding: '8px 16px' }}>
          {loading ? 'Pubblico…' : 'Pubblica'}
        </button>
      </div>
    </form>
  );
}
