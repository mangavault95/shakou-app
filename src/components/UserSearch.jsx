// src/components/UserSearch.jsx
import React from 'react';
import { getAccessToken, displayName } from '../utils/auth';

export default function UserSearch({ user, onChanged }) {
  const [q, setQ] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  async function search(term) {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/social/searchUsers?q=${encodeURIComponent(term || '')}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const json = await res.json();
      setResults(json.users || []);
    } catch (e) {
      console.error('searchUsers failed', e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (user) search('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function toggleFollow(target) {
    const action = target.is_following ? 'unfollow' : 'follow';
    // ottimistico
    setResults(rs => rs.map(r => (r.id === target.id ? { ...r, is_following: !r.is_following } : r)));
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ following_id: target.id, action })
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'follow_failed');
      onChanged && onChanged();
    } catch (e) {
      // rollback
      setResults(rs => rs.map(r => (r.id === target.id ? { ...r, is_following: target.is_following } : r)));
    }
  }

  if (!user) return null;

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 12, background: '#fff' }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Persone</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') search(q); }}
          placeholder="Cerca utenti…"
          style={{ flex: 1, padding: 8, border: '1px solid #eee', borderRadius: 8, minWidth: 0 }}
        />
        <button onClick={() => search(q)} style={{ padding: '8px 12px' }}>Cerca</button>
      </div>
      {loading && <div style={{ color: '#666', fontSize: 13 }}>Caricamento…</div>}
      {results.map(u => (
        <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
          <div style={{ fontSize: 14 }}>{displayName(u)}</div>
          <button
            onClick={() => toggleFollow(u)}
            style={{
              padding: '4px 10px',
              fontSize: 13,
              background: u.is_following ? '#eee' : undefined,
              color: u.is_following ? '#333' : undefined
            }}
          >
            {u.is_following ? 'Segui già' : 'Segui'}
          </button>
        </div>
      ))}
      {!loading && results.length === 0 && <div style={{ color: '#666', fontSize: 13 }}>Nessun utente.</div>}
    </div>
  );
}
