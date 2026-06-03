// src/components/MangaCard.jsx
import React from 'react';
import { normalizeTitle } from '../utils/normalizeTitle';

export default function MangaCard({ manga, user, onOpen, setView }) {
  const title = normalizeTitle(manga.title || manga.title_raw || manga);
  const cover = manga.coverImage?.large || manga.coverImage?.medium || manga.cover_url || '/placeholder-cover.png';
  const [loading, setLoading] = React.useState(false);

  async function follow(e) {
    e.stopPropagation();
    if (!user) return alert('Devi essere loggato.');
    setLoading(true);
    try {
      const body = {
        user_id: user.id,
        manga: {
          external_id: manga.id || manga.external_id,
          source: manga.source || 'anilist',
          title,
          cover_url: cover
        }
      };

      const res = await fetch('/api/social/followManga', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-token': import.meta.env.VITE_SYNC_SECRET || ''
        },
        body: JSON.stringify(body)
      });

      const text = await res.text();
      if (!res.ok) {
        console.error('followManga error response:', text);
        alert('Errore server: ' + (text || res.status));
        return;
      }

      let json;
      try { json = JSON.parse(text); } catch (e) { json = null; }

      if (!json) {
        alert('Risposta non valida dal server.');
        return;
      }

      if (json?.ok) {
        alert('Aggiunto ai tuoi manga.');
        if (typeof setView === 'function') {
          setView('profile');
        }
      } else {
        alert('Errore: ' + (json?.error || 'unknown'));
      }
    } catch (err) {
      console.error('follow request failed', err);
      alert('Errore di rete');
    } finally {
      setLoading(false);
    }
  }

  function handleOpen(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    if (onOpen) onOpen(manga);
  }

  return (
    <article
      onClick={handleOpen}
      style={{
        border: '1px solid #eee',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 320,
        cursor: 'pointer'
      }}
    >
      <div style={{ height: 260, backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ color: '#666', fontSize: 13 }}>{(manga.genres || []).slice(0, 3).join(', ')}</div>
        <p style={{ fontSize: 13, color: '#444', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
          {manga.description ? (manga.description.length > 220 ? manga.description.slice(0, 220) + '…' : manga.description) : 'Nessuna descrizione.'}
        </p>
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Pop: {manga.popularity || '—'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={(e) => { e.stopPropagation(); onOpen && onOpen(manga); }} style={{ padding: '6px 10px' }}>Apri</button>
            <button onClick={follow} disabled={loading} style={{ padding: '6px 10px' }}>{loading ? '...' : 'Segui'}</button>
          </div>
        </div>
      </div>
    </article>
  );
}
