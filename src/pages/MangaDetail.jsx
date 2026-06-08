// src/pages/MangaDetail.jsx
import React from 'react';
import { normalizeTitle } from '../utils/normalizeTitle';

const ANILIST_URL = 'https://graphql.anilist.co';

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: MANGA) {
      id
      title { romaji english native }
      coverImage { large extraLarge }
      description(asHtml: false)
      genres
      status
      popularity
      averageScore
      chapters
      volumes
      startDate { year }
      staff(perPage: 6) { edges { node { name { full } } } }
      siteUrl
    }
  }
`;

// AniList description usa HTML leggero (<br>, <i>, ...). Lo ripuliamo per il testo.
function stripHtml(s) {
  if (!s) return '';
  return s
    .replace(/<br\s*\/?>(\n)?/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export default function MangaDetail({ selectedManga, setView }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  // La ricerca usa `externalId`, la libreria usa `external_id`: supportiamo entrambi.
  const externalId = selectedManga?.externalId ?? selectedManga?.external_id ?? null;
  const backView = selectedManga?.origin || 'explore';

  React.useEffect(() => {
    if (!externalId) return;
    let active = true;
    setLoading(true);
    setError(null);

    fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: DETAIL_QUERY, variables: { id: Number(externalId) } })
    })
      .then(r => r.json())
      .then(json => {
        if (!active) return;
        if (json.errors) throw new Error(json.errors[0]?.message || 'Errore AniList');
        setData(json?.data?.Media || null);
      })
      .catch(e => { if (active) setError(e.message || 'Errore di rete'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [externalId]);

  if (!selectedManga) {
    return (
      <div style={{ padding: 20 }}>
        <p>Nessun manga selezionato.</p>
      </div>
    );
  }

  // Dati AniList se disponibili, altrimenti la "preview" passata da chi ci ha aperto.
  const m = data || {};
  const title = normalizeTitle(m.title || selectedManga.title || selectedManga);
  const cover = m.coverImage?.extraLarge || m.coverImage?.large || selectedManga.cover_url || '/placeholder-cover.png';
  const synopsis = stripHtml(m.description) || stripHtml(selectedManga.synopsis) || '';
  const genres = m.genres || [];
  const authors = (m.staff?.edges || []).map(e => e.node?.name?.full).filter(Boolean);
  const year = m.startDate?.year;

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <button onClick={() => setView && setView(backView)} style={{ marginBottom: 12 }}>← Torna</button>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
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

        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ marginTop: 0, marginBottom: 4 }}>{title}</h1>
          <div style={{ color: '#666', fontSize: 13 }}>
            {[m.status, year].filter(Boolean).join(' · ') || '—'}
          </div>

          {authors.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 14 }}>di <strong>{authors.join(', ')}</strong></div>
          )}

          {genres.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {genres.map(g => (
                <span key={g} style={{ fontSize: 12, padding: '3px 8px', background: '#f1f1f1', borderRadius: 999 }}>{g}</span>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 18 }}>
            <div><strong>{m.volumes ?? '—'}</strong><div style={{ fontSize: 12, color: '#666' }}>Volumi</div></div>
            <div><strong>{m.chapters ?? '—'}</strong><div style={{ fontSize: 12, color: '#666' }}>Capitoli</div></div>
            <div><strong>{m.averageScore != null ? `${m.averageScore}%` : '—'}</strong><div style={{ fontSize: 12, color: '#666' }}>Voto</div></div>
          </div>

          {loading && <div style={{ marginTop: 16, color: '#666' }}>Caricamento dettagli…</div>}
          {error && <div style={{ marginTop: 16, color: 'crimson' }}>{error}</div>}

          <div style={{ marginTop: 16 }}>
            <p style={{ whiteSpace: 'pre-wrap', color: '#333', lineHeight: 1.5 }}>
              {synopsis || (loading ? '' : 'Nessuna descrizione disponibile.')}
            </p>
          </div>

          {m.siteUrl && (
            <a
              href={m.siteUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-block', marginTop: 8, fontSize: 13, color: '#2563eb' }}
            >
              Vedi su AniList ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
