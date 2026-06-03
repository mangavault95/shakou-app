import React from 'react';
import { supabase } from '../supabase';

export default function PostComposer({ user, onPosted }) {
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function submit(e) {
    e?.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    const body = { user_id: user.id, content: text };
    const res = await fetch('/api/social/createPost', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const json = await res.json();
    setLoading(false);
    if (json?.ok) {
      setText('');
      onPosted && onPosted(json.post);
    } else {
      alert('Errore: ' + (json?.error || 'unknown'));
    }
  }

  return (
    <form onSubmit={submit} style={{ marginBottom:16 }}>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Parla di questo manga..." style={{ width:'100%', minHeight:80, padding:8 }} />
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
        <button type="submit" disabled={loading} style={{ padding:'8px 12px' }}>{loading ? 'Pubblicando...' : 'Pubblica'}</button>
      </div>
    </form>
  );
}
