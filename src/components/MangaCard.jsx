import React from 'react';

export default function MangaCard({ manga }) {
  const title = manga.title?.english || manga.title?.romaji || manga.title?.native || 'Untitled';
  const cover = manga.coverImage?.large || manga.coverImage?.medium || '/placeholder-cover.png';
  const genres = (manga.genres || []).slice(0,3).join(', ');
  const year = manga.startDate?.year || '';

  return (
    <article style={{
      border:'1px solid #eee', borderRadius:10, overflow:'hidden', background:'#fff',
      display:'flex', flexDirection:'column', minHeight:320
    }}>
      <div style={{ height:260, backgroundImage:`url(${cover})`, backgroundSize:'cover', backgroundPosition:'center' }} />
      <div style={{ padding:12, display:'flex', flexDirection:'column', gap:8, flex:1 }}>
        <div style={{ fontWeight:700 }}>{title}</div>
        <div style={{ color:'#666', fontSize:13 }}>{genres} {year ? `• ${year}` : ''}</div>
        <p style={{ fontSize:13, color:'#444', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>
          {manga.description ? (manga.description.length > 220 ? manga.description.slice(0,220) + '…' : manga.description) : 'Nessuna descrizione.'}
        </p>
        <div style={{ marginTop:'auto', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:13, color:'#888' }}>Pop: {manga.popularity || '—'}</div>
          <div style={{ display:'flex', gap:8 }}>
            <button style={{ padding:'6px 10px' }}>Segui</button>
            <button style={{ padding:'6px 10px' }}>Apri</button>
          </div>
        </div>
      </div>
    </article>
  );
}
