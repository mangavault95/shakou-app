// src/components/MangaSocial.jsx
import React from 'react';
import StarRating from './StarRating';
import { getAccessToken, displayName } from '../utils/auth';

const tabStyle = (active) => ({
  padding: '6px 14px',
  borderRadius: 999,
  border: '1px solid #eee',
  background: active ? '#f44336' : '#fff',
  color: active ? '#fff' : '#333',
  cursor: 'pointer'
});

export default function MangaSocial({ source = 'anilist', externalId, user, title, titleEn }) {
  const [scope, setScope] = React.useState('manga'); // 'manga' | 'chapter'
  const [chapterInput, setChapterInput] = React.useState('');
  const [activeChapter, setActiveChapter] = React.useState(null);

  const [chapterList, setChapterList] = React.useState([]);
  const [chaptersLoading, setChaptersLoading] = React.useState(false);
  const [chaptersLoaded, setChaptersLoaded] = React.useState(false);

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [myRating, setMyRating] = React.useState(0);
  const [reviewText, setReviewText] = React.useState('');
  const [commentText, setCommentText] = React.useState('');

  const effScope = scope === 'chapter' ? 'chapter' : 'manga';
  const effNumber = scope === 'chapter' ? activeChapter : null;
  const ready = Boolean(source && externalId && (scope === 'manga' || activeChapter != null));

  async function load() {
    if (!ready) { setData(null); return; }
    setLoading(true);
    try {
      const token = await getAccessToken();
      const params = new URLSearchParams({ source, external_id: String(externalId), scope: effScope });
      if (effNumber != null) params.set('scope_number', String(effNumber));
      const res = await fetch(`/api/manga-social?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const json = await res.json();
      setData(json);
      setMyRating(json?.ratings?.my_rating?.rating || 0);
      setReviewText(json?.ratings?.my_rating?.body || '');
    } catch (e) {
      console.error('manga-social load failed', e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, externalId, effScope, effNumber]);

  // Reset quando si cambia manga (evita di mostrare i capitoli del manga precedente)
  React.useEffect(() => {
    setScope('manga');
    setActiveChapter(null);
    setChapterInput('');
    setChapterList([]);
    setChaptersLoaded(false);
  }, [externalId]);

  // Carica la lista capitoli reale da MangaDex la prima volta che si apre la tab Capitolo
  React.useEffect(() => {
    if (scope !== 'chapter' || chaptersLoaded || (!title && !titleEn)) return;
    let active = true;
    setChaptersLoading(true);
    const params = new URLSearchParams({ kind: 'chapters', external_id: String(externalId || '') });
    if (title) params.set('title', title);
    if (titleEn) params.set('title_en', titleEn);
    fetch(`/api/manga-social?${params.toString()}`)
      .then(r => r.json())
      .then(j => { if (active) { setChapterList(j.chapters || []); setChaptersLoaded(true); } })
      .catch(() => { if (active) setChaptersLoaded(true); })
      .finally(() => { if (active) setChaptersLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, chaptersLoaded, title, titleEn, externalId]);

  async function postAction(payload) {
    const token = await getAccessToken();
    const res = await fetch('/api/manga-social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ source, external_id: String(externalId), scope: effScope, scope_number: effNumber, ...payload })
    });
    return res.json();
  }

  async function rate(n) {
    if (!user) return alert('Accedi per votare.');
    setMyRating(n);
    const json = await postAction({ action: 'rate', rating: n, body: reviewText });
    if (json?.ok) load(); else alert('Errore: ' + (json?.error || 'unknown'));
  }

  async function saveReview() {
    if (!user) return alert('Accedi per recensire.');
    if (!myRating) return alert('Metti prima un voto.');
    const json = await postAction({ action: 'rate', rating: myRating, body: reviewText });
    if (json?.ok) load(); else alert('Errore: ' + (json?.error || 'unknown'));
  }

  async function submitComment(e) {
    e?.preventDefault();
    const text = commentText.trim();
    if (!text || !user) return;
    const json = await postAction({ action: 'comment', body: text });
    if (json?.ok) { setCommentText(''); load(); } else alert('Errore: ' + (json?.error || 'unknown'));
  }

  function openChapter() {
    const n = parseInt(chapterInput, 10);
    if (!n || n < 1) return;
    setActiveChapter(n);
  }

  const avg = data?.ratings?.average;
  const count = data?.ratings?.count || 0;
  const reviews = data?.ratings?.reviews || [];
  const comments = data?.comments || [];

  return (
    <div style={{ marginTop: 28, borderTop: '1px solid #eee', paddingTop: 18 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setScope('manga')} style={tabStyle(scope === 'manga')}>Manga</button>
        <button onClick={() => setScope('chapter')} style={tabStyle(scope === 'chapter')}>Capitolo</button>
      </div>

      {scope === 'chapter' && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {chaptersLoading && <span style={{ color: '#666', fontSize: 13 }}>Caricamento capitoli…</span>}

          {!chaptersLoading && chapterList.length > 0 && (
            <select
              value={activeChapter ?? ''}
              onChange={e => setActiveChapter(e.target.value ? Number(e.target.value) : null)}
              style={{ padding: 8, borderRadius: 6, border: '1px solid #eee', minWidth: 220 }}
            >
              <option value="">Scegli un capitolo… ({chapterList.length})</option>
              {chapterList.map(c => (
                <option key={c.number} value={c.number}>
                  Capitolo {c.number}{c.volume ? ` (Vol. ${c.volume})` : ''}
                </option>
              ))}
            </select>
          )}

          {!chaptersLoading && chaptersLoaded && chapterList.length === 0 && (
            <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#666', fontSize: 13 }}>Lista non disponibile, inserisci il numero:</span>
              <input
                type="number"
                min="1"
                value={chapterInput}
                onChange={e => setChapterInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') openChapter(); }}
                placeholder="N°"
                style={{ width: 70, padding: 6, border: '1px solid #eee', borderRadius: 6 }}
              />
              <button onClick={openChapter}>Apri</button>
            </span>
          )}
        </div>
      )}

      {scope === 'chapter' && activeChapter == null ? (
        <div style={{ color: '#666' }}>Inserisci il numero del capitolo per vedere voti e commenti.</div>
      ) : (
        <>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: '0 0 8px' }}>
              {scope === 'manga' ? 'Voto e recensione' : `Capitolo ${activeChapter}`}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{avg != null ? avg : '—'}</div>
                <div style={{ fontSize: 12, color: '#666' }}>media · {count} {count === 1 ? 'voto' : 'voti'}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Il tuo voto</div>
                <StarRating value={myRating} onRate={rate} readOnly={!user} />
              </div>
            </div>
            <textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="Scrivi una recensione (opzionale)…"
              style={{ width: '100%', marginTop: 10, minHeight: 60, padding: 8, border: '1px solid #eee', borderRadius: 8, boxSizing: 'border-box' }}
              disabled={!user}
            />
            <div style={{ marginTop: 6 }}>
              <button onClick={saveReview} disabled={!user || !myRating}>Salva recensione</button>
            </div>
          </div>

          {reviews.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <h4 style={{ margin: '0 0 8px' }}>Recensioni</h4>
              {reviews.map(r => (
                <div key={r.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '8px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 14 }}>{displayName(r.author)}</strong>
                    <StarRating value={r.rating} readOnly size={16} />
                  </div>
                  {r.body && <div style={{ fontSize: 14, color: '#333', marginTop: 4, whiteSpace: 'pre-wrap' }}>{r.body}</div>}
                </div>
              ))}
            </div>
          )}

          <div>
            <h4 style={{ margin: '0 0 8px' }}>Commenti</h4>
            {loading && <div style={{ color: '#666', fontSize: 13 }}>Caricamento…</div>}
            {comments.map(c => (
              <div key={c.id} style={{ padding: '6px 0' }}>
                <strong style={{ fontSize: 13 }}>{displayName(c.author)}</strong>
                <span style={{ marginLeft: 8, fontSize: 13, color: '#333' }}>{c.body}</span>
              </div>
            ))}
            {!loading && comments.length === 0 && <div style={{ color: '#666', fontSize: 13 }}>Ancora nessun commento.</div>}
            {user ? (
              <form onSubmit={submitComment} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Scrivi un commento…"
                  style={{ flex: 1, padding: 8, border: '1px solid #eee', borderRadius: 8 }}
                />
                <button type="submit" disabled={!commentText.trim()}>Invia</button>
              </form>
            ) : (
              <div style={{ color: '#666', fontSize: 13, marginTop: 8 }}>Accedi per commentare.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
