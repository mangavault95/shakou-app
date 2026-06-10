// src/components/MangaCard.jsx
import React from 'react';
import { normalizeTitle } from '../utils/normalizeTitle';
import { getAccessToken } from '../utils/auth';

export default function MangaCard({ manga, user, onOpen }) {
  const title = normalizeTitle(manga.title || manga.title_raw || manga);
  const cover = manga.coverImage?.large || manga.coverImage?.medium || manga.cover_url || '/placeholder-cover.png';
  const [adding, setAdding] = React.useState(false);
  const [added, setAdded] = React.useState(false);

  async function follow(e) {
    e.stopPropagation();
    if (!user) return alert('Devi essere loggato.');
    setAdding(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/social/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'follow',
          manga: { external_id: manga.id || manga.external_id, source: manga.source || 'anilist', title, cover_url: cover }
        })
      });
      const json = await res.json().catch(() => null);
      if (json?.ok) setAdded(true);
      else alert('Errore: ' + (json?.error || res.status));
    } catch {
      alert('Errore di rete');
    } finally {
      setAdding(false);
    }
  }

  const genres = (manga.genres || []).slice(0, 2);

  return (
    <article
      onClick={() => onOpen?.(manga)}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow .18s, transform .18s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Cover */}
      <div style={{
        width: '100%',
        paddingTop: '145%',
        position: 'relative',
        background: 'var(--accent-light)',
        overflow: 'hidden',
      }}>
        <img
          src={cover}
          alt={title}
          loading="lazy"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
          }}
        />
        {/* Overlay bottone + su hover */}
        <button
          onClick={follow}
          disabled={adding || added}
          style={{
            position: 'absolute', bottom: 8, right: 8,
            padding: '5px 10px', fontSize: 12, fontWeight: 700,
            background: added ? 'var(--gold)' : 'var(--accent)',
            color: '#fff', borderRadius: 8, border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            opacity: adding ? 0.7 : 1,
          }}
        >
          {added ? '✓' : adding ? '…' : '+'}
        </button>
      </div>

      {/* Info sotto la cover */}
      <div style={{ padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{
          fontWeight: 700, fontSize: 13, lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          color: 'var(--text)',
        }}>
          {title}
        </div>

        {genres.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
            {genres.map(g => (
              <span key={g} style={{
                fontSize: 10, fontWeight: 600,
                padding: '2px 7px', borderRadius: 99,
                background: 'var(--accent-light)', color: 'var(--accent)',
                border: '1px solid rgba(124,58,237,0.15)',
                letterSpacing: '.02em',
              }}>{g}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
