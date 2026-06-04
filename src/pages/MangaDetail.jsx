// src/pages/MangaDetail.jsx
import React from 'react';
import { normalizeTitle } from '../utils/normalizeTitle';

export default function MangaDetail({ selectedManga, setView, onOpenVolume }) {
  if (!selectedManga) {
    return (
      <div style={{ padding: 20 }}>
        <p>Nessun manga selezionato.</p>
      </div>
    );
  }

  const title = normalizeTitle(selectedManga.title || selectedManga);
  const cover = selectedManga.cover_url || '/placeholder-cover.png';
  const synopsis = selectedManga.synopsis_display || selectedManga.synopsis || '';

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <button onClick={() => setView && setView('profile')} style={{ marginBottom: 12 }}>← Torna</button>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ width: 260 }}>
          <div
            style={{
              width: '100%',
              paddingTop: '140%',
              backgroundImage: `url(${cover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: 8
            }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{ marginTop: 0 }}>{title}</h1>
          <p style={{ color: '#666', marginTop: 4 }}>Source: {selectedManga.source || '—'}</p>
          <div style={{ marginTop: 12 }}>
            <p style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{synopsis}</p>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <div><strong>{selectedManga.volumes_count || 0}</strong><div style={{ fontSize: 12 }}>Volumi</div></div>
            <div><strong>{selectedManga.chapters_count || 0}</strong><div style={{ fontSize: 12 }}>Capitoli</div></div>
          </div>

          <div style={{ marginTop: 18 }}>
            <h3 style={{ marginBottom: 8 }}>Volumi</h3>
            {(selectedManga.volumes || []).slice(0, 20).map(v => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Vol. {v.volume_number}{v.title ? ` — ${v.title}` : ''}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{v.published_at ? new Date(v.published_at).getFullYear() : ''}</div>
                </div>
                <div>
                  <button onClick={() => onOpenVolume && onOpenVolume(v)} style={{ padding: '6px 10px' }}>Apri</button>
                </div>
              </div>
            ))}
            {(!selectedManga.volumes || selectedManga.volumes.length === 0) && <div style={{ color: '#666' }}>Nessun volume disponibile.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
