// src/components/MangaLibrary.jsx
import React from 'react';

export default function MangaLibrary({ user }) {
  const [library, setLibrary] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

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

  if (!user) return <div>Devi essere loggato.</div>;
  if (loading) return <div>Caricamento libreria...</div>;
  if (!library.length) return <div>La tua libreria è vuota.</div>;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
      {library.map(item => {
        const m = item.manga || {};
        const title = m.title || (m.title && (m.title.romaji || m.title.english)) || 'Untitled';
        const cover = m.cover_url || m.coverImage?.large || '/placeholder-cover.png';
        return (
          <article key={item.id || item.manga_id} style={{ border:'1px solid #eee', borderRadius:8, overflow:'hidden' }}>
            <div style={{ height:220, backgroundImage:`url(${cover})`, backgroundSize:'cover', backgroundPosition:'center' }} />
            <div style={{ padding:8 }}>
              <div style={{ fontWeight:700 }}>{title}</div>
              <div style={{ color:'#666', fontSize:13, marginTop:6 }}>Status: {item.status || '—'}</div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
