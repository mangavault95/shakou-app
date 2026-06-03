import React from 'react';
import MangaCard from '../components/MangaCard';
import Credits from '../components/Credits';

const ANILIST_URL = 'https://graphql.anilist.co';

export default function MangaSearch() {
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);

  async function search(q, p = 1) {
    setLoading(true);
    const gql = `
      query ($q: String, $page:Int, $perPage:Int) {
        Page(page:$page, perPage:$perPage) {
          pageInfo { total, currentPage, lastPage, hasNextPage }
          media(type: MANGA, search: $q) {
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
    const variables = { q: q || null, page: p, perPage: 12 };
    try {
      const r = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: gql, variables })
      });
      const json = await r.json();
      const media = json?.data?.Page?.media || [];
      setResults(media);
      setHasMore(Boolean(json?.data?.Page?.pageInfo?.hasNextPage));
      setPage(p);
    } catch (e) {
      console.error('AniList search error', e);
      setResults([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    // carica una lista iniziale popolare
    search('', 1);
  }, []);

  return (
    <div style={{ padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h2>Esplora Manga</h2>
        <div style={{ display:'flex', gap:8 }}>
          <input
            placeholder="Cerca titolo, autore, genere..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') search(query, 1); }}
            style={{ padding:8, width:360 }}
          />
          <button onClick={() => search(query, 1)} style={{ padding:'8px 12px' }}>Cerca</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
        {loading ? <div>Caricamento...</div> : results.map(m => <MangaCard key={m.id} manga={m} />)}
      </div>

      <div style={{ marginTop:18, display:'flex', justifyContent:'center', gap:8 }}>
        <button onClick={() => search(query, Math.max(1, page - 1))} disabled={page <= 1}>Prev</button>
        <div style={{ alignSelf:'center' }}>Pagina {page}</div>
        <button onClick={() => search(query, page + 1)} disabled={!hasMore}>Next</button>
      </div>

      <div style={{ marginTop:28 }}>
        <Credits />
      </div>
    </div>
  );
}
