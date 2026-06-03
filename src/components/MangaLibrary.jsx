// src/components/MangaLibrary.jsx
import React from 'react';

export default function MangaLibrary({ user, setView, setSelectedManga }) {
  const [library, setLibrary] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [removing, setRemoving] = React.useState({}); // map id -> bool

  React.useEffect(() => {
    if (!user?.id) return;
    fetchLibrary();
    // eslint-disable-next-line
  }, [user?.id]);

  async function fetchLibrary() {
    setLoading(true);
    try {
      const res = await fetch(`/api/social/getUserLibrary?user_id=${encodeURIComponent(user.id)}`, {
        headers: { 'Content-Type': 'application/json', 'x-sync-token': import.meta.env.VITE_SYNC_SECRET || '' }
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch (e) { json = null; }
      if (!res.ok) {
        console.error('getUserLibrary error', text);
        setLibrary([]);
        return;
      }
      setLibrary(json?.library || []);
    } catch (err) {
      console.error('fetchLibrary failed', err);
      setLibrary([]);
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(item) {
    const id = item.id || item.manga_id || item.external_id;
    if (!id) return;
    // ottimistic UI
    const prev = library;
    setLibrary(prev.filter(i => i !== item));
    setRemoving(r => ({ ...r, [id]: true }));

    try {
      const res = await fetch('/api/social/unfollowManga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-sync-token': import.meta.env.VITE_SYNC_SECRET || '' },
        body: JSON.stringify({ user_id: user.id, manga_id: item.manga_id || item.manga?.id || item.manga_id, external_id: item.external_id || item.manga?.external_id })
      });
      const text = await res.text();
      if (!res.ok) {
        console.error('unfollow error', text);
        alert('Impossibile rimuovere. Riprova.');
        setLibrary(prev);
        return;
      }
      let json;
      try { json = JSON.parse(text); } catch (e) { json = null; }
      if (!json || !json.ok) {
        alert('Errore server durante la rimozione.');
        setLibrary(prev);
      }
    } catch (err) {
      console.error('removeItem failed', err);
      alert('Errore di rete durante la rimozione.');
      setLibrary(prev);
    } finally {
      setRemoving(r => { const copy = { ...r }; delete copy[id]; return copy; });
    }
  }

  function openDetail(item) {
    const manga = item.manga || { id: item.manga_id, external_id: item.external_id, source: item.source, title: item.title };
    if (typeof setSelectedManga === 'function') {
      setSelectedManga({ externalId: manga.external_id || manga.id, source: manga.source || 'anilist' });
      setView && setView('manga');
    } else {
      // fallback: try to open detail via navigation if your app supports routes
      // window.location.href = `/manga/${manga.external_id || manga.id}`;
    }
  }

  if (!user) return <div>Devi essere loggato.</div>;
  if (loading) return <div>Caricamento libreria...</div>;
  if (!library.length) return <div>La tua libreria è vuota.</div>;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
      {library.map(item => {
        const m = item.manga || {};
        const title = m.title || (m.title && (m.title.romaji || m.title.english)) || (typeof m === 'string' ? m : 'Untitled');
        const cover = m.cover_url || m.coverImage?.large || '/placeholder-cover.png';
        const key = item.id || item.manga_id || item.external_id;
        return (
          <article key={key} style={{ border:'1px solid #eee', borderRadius:8, overflow:'hidden', display:'flex', flexDirection:'column', cursor:'pointer' }}>
            <div
              onClick={() => openDetail(item)}
              style={{ height:220, backgroundImage:`url(${cover})`, backgroundSize:'cover', backgroundPosition:'center' }}
            />
            <div style={{ padding:8, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ fontWeight:700 }}>{typeof title === 'object' ? (title.romaji || title.english || 'Untitled') : title}</div>
              <div style={{ color:'#666', fontSize:13 }}>Status: {item.status || '—'}</div>
              <div style={{ display:'flex', gap:8, marginTop:6 }}>
                <button onClick={(e) => { e.stopPropagation(); openDetail(item); }} style={{ padding:'6px 10px' }}>Dettagli</button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeItem(item); }}
                  disabled={Boolean(removing[key])}
                  style={{ padding:'6px 10px' }}
                >
                  {removing[key] ? 'Rimuovendo…' : 'Rimuovi'}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
