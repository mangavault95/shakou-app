import React from 'react';
import MangaCard from '../components/MangaCard';
import Credits from '../components/Credits';

const ANILIST_URL = 'https://graphql.anilist.co';

export default function MangaSearch({ user, setView, setSelectedManga }) {
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);

  async function search(q = '', p = 1) {
    setLoading(true);
    const gql = `
      query ($q: String, $page:Int, $perPage:Int) {
        Page(page:$page, perPage:$perPage) {
          pageInfo { hasNextPage }
          media(type: MANGA, search: $q, sort: POPULARITY_DESC) {
            id
            title { romaji english native }
            coverImage { large medium }
            genres
            description(asHtml:false)
            status
            popularity
            startDate { year }
          }
        }
      }
    `;
    try {
      const r = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: gql, variables: { q: q || null, page: p, perPage: 24 } })
      });
      const json = await r.json();
      const media = json?.data?.Page?.media || [];
      setResults(media);
      setHasMore(Boolean(json?.data?.Page?.pageInfo?.hasNextPage));
      setPage(p);
    } catch {
      setResults([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { search('', 1); }, []); // eslint-disable-line

  function openDetail(manga) {
    if (!setSelectedManga || !setView) return;
    setSelectedManga({
      externalId: manga.id,
      source: 'anilist',
      origin: 'explore',
      title: manga.title,
      cover_url: manga.coverImage?.large || manga.coverImage?.medium,
      synopsis: manga.description
    });
    setView('manga');
  }

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Barra di ricerca */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20,
        background: 'var(--surface)',
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <input
          placeholder="Cerca titolo, genere…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') search(query, 1); }}
          style={{
            flex: 1, padding: '10px 14px', fontSize: 15,
            border: '1px solid var(--border)', borderRadius: 8,
          }}
        />
        <button
          onClick={() => search(query, 1)}
          style={{
            padding: '10px 20px', fontWeight: 700, fontSize: 14,
            background: 'var(--accent)', borderRadius: 8,
          }}
        >
          Cerca
        </button>
      </div>

      {/* Griglia */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>Caricamento…</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 14,
        }}>
          {results.map(m => (
            <MangaCard key={m.id} manga={m} user={user} onOpen={openDetail} />
          ))}
        </div>
      )}

      {/* Paginazione */}
      {!loading && results.length > 0 && (
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => search(query, Math.max(1, page - 1))}
            disabled={page <= 1}
            style={{ padding: '8px 18px', background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 8, fontWeight: 600 }}
          >← Prec.</button>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Pagina {page}</span>
          <button
            onClick={() => search(query, page + 1)}
            disabled={!hasMore}
            style={{ padding: '8px 18px', background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 8, fontWeight: 600 }}
          >Succ. →</button>
        </div>
      )}

      <div style={{ marginTop: 32 }}><Credits /></div>
    </div>
  );
}
