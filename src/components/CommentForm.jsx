import React, { useState } from 'react';

/**
 * Props:
 * - chapterId: string (required)
 * - getAccessToken: async function that returns access token string (required for POST)
 * - onPosted: function(comment) optional callback called after successful post
 * - onOptimisticAdd: function(tempComment) optional callback to add optimistic comment to UI
 */
export default function CommentForm({ chapterId, getAccessToken, onPosted, onOptimisticAdd }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  if (!chapterId) return null;

  async function handleSubmit(e) {
    e && e.preventDefault();
    setError(null);
    const trimmed = (text || '').trim();
    if (!trimmed) {
      setError('Inserisci un commento.');
      return;
    }

    // optimistic comment
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      user_id: 'you',
      body: trimmed,
      parent_id: null,
      visibility: 'public',
      created_at: new Date().toISOString(),
      optimistic: true
    };
    onOptimisticAdd && onOptimisticAdd(optimistic);

    setSending(true);
    try {
      const token = getAccessToken ? await getAccessToken() : null;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`/api/chapters/${chapterId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ body: trimmed, parent_id: null })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Errore invio');

      // replace optimistic with real comment via callback
      onPosted && onPosted({ tempId, comment: json.comment });
      setText('');
    } catch (err) {
      console.error('post comment', err);
      setError(err.message || 'Errore invio commento');
      // signal failure by calling onPosted with null
      onPosted && onPosted({ tempId, comment: null, error: err });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Scrivi un commento..."
        rows={3}
        style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #e6e6e6', resize: 'vertical' }}
        disabled={sending}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="submit" disabled={sending} style={{ padding: '8px 12px' }}>
          {sending ? 'Invio…' : 'Invia commento'}
        </button>
        <button type="button" onClick={() => setText('')} disabled={sending} style={{ padding: '8px 12px' }}>
          Annulla
        </button>
      </div>
      {error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}
    </form>
  );
}
