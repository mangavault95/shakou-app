// src/pages/MangaDetail.jsx
import React from 'react';
import { normalizeTitle } from '../utils/normalizeTitle';
import MangaSocial from '../components/MangaSocial';

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
      averageScore
      chapters
      volumes
      startDate { year }
      staff(perPage: 12) { edges { role node { name { full } } } }
      siteUrl
    }
  }
`;

// Stato AniList -> italiano
const STATUS_IT = {
  FINISHED: 'Concluso',
  RELEASING: 'In corso',
  NOT_YET_RELEASED: 'Non ancora uscito',
  CANCELLED: 'Cancellato',
  HIATUS: 'In pausa'
};

// Generi AniList -> italiano (fallback all'originale se non mappato)
const GENRE_IT = {
  Action: 'Azione',
  Adventure: 'Avventura',
  Comedy: 'Commedia',
  Drama: 'Dramma',
  Ecchi: 'Ecchi',
  Fantasy: 'Fantasy',
  Horror: 'Horror',
  'Mahou Shoujo': 'Mahou Shoujo',
  Mecha: 'Mecha',
  Music: 'Musica',
  Mystery: 'Mistero',
  Psychological: 'Psicologico',
  Romance: 'Sentimentale',
  'Sci-Fi': 'Fantascienza',
  'Slice of Life': 'Spaccato di vita',
  Sports: 'Sport',
  Supernatural: 'Soprannaturale',
  Thriller: 'Thriller'
};

// AniList description usa HTML leggero (<br>, <i>, ...). Lo ripuliamo e togliamo
// la riga "(Source: ...)" e l'eventuale sezione "Notes:".
function cleanDescription(s) {
  if (!s) return '';
  let t = s
    .replace(/<br\s*\/?>(\n)?/gi, '\n')
    .replace(/<[^>]+>/g, '');
  t = t.replace(/\(Source:[^)]*\)/gi, '');           // rimuovi "(Source: ...)"
  t = t.replace(/\n\s*Notes?\s*:[\s\S]*$/i, '');      // taglia da "Notes:" in poi
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

// Solo l'autore principale: ruolo Story/Art/Creator, non traduttori/editori.
function pickMainAuthor(staff) {
  const edges = staff?.edges || [];
  const main = edges.find(e => /story|art|creator/i.test(e.role || ''));
  return (main || edges[0])?.node?.name?.full || null;
}

export default function MangaDetail({ selectedManga, setView, user }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [synopsisIt, setSynopsisIt] = React.useState('');

  // La ricerca usa `externalId`, la libreria usa `external_id`: supportiamo entrambi.
  const externalId = selectedManga?.externalId ?? selectedManga?.external_id ?? null;
  const backView = selectedManga?.origin || 'explore';

  // 1) Carica i dettagli da AniList
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

  // 2) Traduci la trama in italiano (fallback: testo originale ripulito)
  const rawSynopsis = cleanDescription(data?.description || selectedManga?.synopsis);
  React.useEffect(() => {
    if (!rawSynopsis) { setSynopsisIt(''); return; }
    let active = true;
    setSynopsisIt(''); // azzera mentre traduce
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawSynopsis, target: 'it' })
    })
      .then(r => r.json())
      .then(j => { if (active) setSynopsisIt(j.translated || rawSynopsis); })
      .catch(() => { if (active) setSynopsisIt(rawSynopsis); });
    return () => { active = false; };
  }, [rawSynopsis]);

  if (!selectedManga) {
    return (
      <div style={{ padding: 20 }}>
        <p>Nessun manga selezionato.</p>
      </div>
    );
  }

  const m = data || {};
  const title = normalizeTitle(m.title || selectedManga.title || selectedManga);
  const cover = m.coverImage?.extraLarge || m.coverImage?.large || selectedManga.cover_url || '/placeholder-cover.png';
  const genres = m.genres || [];
  const author = pickMainAuthor(m.staff);
  const year = m.startDate?.year;
  const statusIt = m.status ? (STATUS_IT[m.status] || m.status) : null;
  // mostra la traduzione se pronta, altrimenti l'originale ripulito come fallback
  const synopsis = synopsisIt || rawSynopsis;

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
            {[statusIt, year].filter(Boolean).join(' · ') || '—'}
          </div>

          {author && (
            <div style={{ marginTop: 6, fontSize: 14 }}>di <strong>{author}</strong></div>
          )}

          {genres.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {genres.map(g => (
                <span key={g} style={{ fontSize: 12, padding: '3px 8px', background: '#f1f1f1', borderRadius: 999 }}>
                  {GENRE_IT[g] || g}
                </span>
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

      {externalId && (
        <MangaSocial source={selectedManga.source || 'anilist'} externalId={externalId} user={user} />
      )}
    </div>
  );
}
