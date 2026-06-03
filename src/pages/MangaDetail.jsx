// src/pages/MangaDetail.jsx
import React from 'react';
import { normalizeTitle } from '../utils/normalizeTitle';

export default function MangaDetail({ selectedManga, setView }) {
  if (!selectedManga) {
    return (
      <div style={{ padding: 20 }}>
        <p>Nessun manga selezionato.</p>
      </div>
    );
  }

  const title = normalizeTitle(selectedManga.title || selectedManga);
  const cover = selectedManga.cover_url || '/placeholder-cover.png';

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <button onClick={() => setView && setView('profile')} style={{ marginBottom: 12 }}>← Torna</button>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ width: 260 }}>
          <div style={{ width: '100%', paddingTop: '140%', backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ marginTop: 0 }}>{title}</h1>
          <p style={{ color: '#666' }}>Source: {selectedManga.source || '—'}</p>
          <div style={{ marginTop: 12 }}>
            <p>Qui puoi mostrare descrizione, stato, volumi letti, link esterni, ecc.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
