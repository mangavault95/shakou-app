import React from 'react';
import { supabase } from '../supabase';

export default function MangaDetail({ user, externalId, source }) {
  const [manga, setManga] = React.useState(null);
  const [userManga, setUserManga] = React.useState(null);
  const [comments, setComments] = React.useState([]);
  const [commentText, setCommentText] = React.useState('');

  React.useEffect(() => {
    if (!externalId) return;
    fetchAniList();
    fetchComments();
    fetchUserManga();
  }, [externalId]);

  async function fetchAniList() {
    const gql = `query ($id:Int) { Media(id:$id, type:MANGA) { id title { romaji english native } coverImage { large medium } description(asHtml:false) genres status popularity startDate { year } } }`;
    const res = await fetch('https://graphql.anilist.co', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ query: gql, variables: { id: Number(externalId) } })
    });
    const json = await res.json();
    setManga(json?.data?.Media || null);
  }

  async function fetchUserManga() {
    if (!user) return;
    const { data, error } = await supabase.from('user_manga').select('*').eq('user_id', user.id).eq('external_id', String(externalId)).single();
    if (!error) setUserManga(data);
  }

  async function fetchComments() {
    const res = await fetch(`/api/social/mangaComments?manga_id=${externalId}`, { headers: { 'x-sync-token': process.env.REACT_APP_SYNC_SECRET || '' } });
    const json = await res.json();
    setComments(json?.comments || []);
  }

  async function followThis() {
    if (!user) return alert('Devi essere loggato.');
    const body = { user_id: user.id, manga: { external_id: externalId, source: source || 'anilist', title: manga?.title?.romaji || manga?.title?.english, cover_url: manga?.coverImage?.large } };
    const res = await fetch('/api/social/followManga', { method:'POST', headers:{ 'Content-Type':'application/json', 'x-sync-token': process.env.REACT_APP_SYNC_SECRET || '' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (json?.ok) { setUserManga(json.user_manga); alert('Seguito.'); }
  }

  async function saveProgress(updates) {
    if (!user) return alert('Devi essere loggato.');
    const body = { user_id: user.id, manga_id: userManga?.manga_id, updates };
    const res = await fetch('/api/social/updateProgress', { method:'POST', headers:{ 'Content-Type':'application/json', 'x-sync-token': process.env.REACT_APP_SYNC_SECRET || '' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (json?.ok) setUserManga(json.user_manga);
  }

  async function postComment() {
    if (!user || !commentText.trim()) return;
    const body = { user_id: user.id, manga_id: userManga?.manga_id || null, content: commentText };
    const res = await fetch('/api/social/mangaComments', { method:'POST', headers:{ 'Content-Type':'application/json', 'x-sync-token': process.env.REACT_APP_SYNC_SECRET || '' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (json?.ok) { setCommentText(''); fetchComments(); }
  }

  if (!manga) return <div style={{ padding:20 }}>Caricamento dettagli...</div>;

  const title = manga.title?.english || manga.title?.romaji || manga.title?.native;

  return (
    <div style={{ padding:20, maxWidth:900, margin:'0 auto' }}>
      <div style={{ display:'flex', gap:20 }}>
        <img src={manga.coverImage?.large} alt={title} style={{ width:220, borderRadius:8 }} />
        <div>
          <h2>{title}</h2>
          <div style={{ color:'#666' }}>{(manga.genres||[]).join(', ')} • {manga.startDate?.year}</div>
          <p style={{ marginTop:12 }}>{manga.description || 'Nessuna descrizione.'}</p>

          <div style={{ marginTop:12, display:'flex', gap:8 }}>
            <button onClick={followThis}>Segui</button>
            {userManga && (
              <>
                <button onClick={() => saveProgress({ status: userManga.status === 'plan' ? 'reading' : 'completed' })}>Toggle status</button>
              </>
            )}
          </div>

          {userManga && (
            <div style={{ marginTop:12 }}>
              <div>
                <label>Volumi posseduti</label>
                <input type="number" value={userManga.volumes_owned || 0} onChange={e => saveProgress({ volumes_owned: Number(e.target.value) })} style={{ marginLeft:8, width:80 }} />
              </div>
              <div style={{ marginTop:8 }}>
                <label>Volumi letti</label>
                <input type="number" value={userManga.volumes_read || 0} onChange={e => saveProgress({ volumes_read: Number(e.target.value) })} style={{ marginLeft:8, width:80 }} />
              </div>
              <div style={{ marginTop:8 }}>
                <label>Segnalibro</label>
                <input value={userManga.bookmark || ''} onChange={e => saveProgress({ bookmark: e.target.value })} style={{ marginLeft:8 }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <section style={{ marginTop:28 }}>
        <h3>Commenti</h3>
        <div style={{ marginBottom:12 }}>
          <textarea value={commentText} onChange={e => setCommentText(e.target.value)} style={{ width:'100%', minHeight:80 }} />
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
            <button onClick={postComment}>Invia commento</button>
          </div>
        </div>

        <div>
          {comments.map(c => (
            <div key={c.id} style={{ borderTop:'1px solid #eee', padding:'12px 0' }}>
              <div style={{ fontWeight:700 }}>{c.user_id}</div>
              <div style={{ color:'#666', fontSize:13 }}>{new Date(c.created_at).toLocaleString()}</div>
              <div style={{ marginTop:8 }}>{c.content}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
