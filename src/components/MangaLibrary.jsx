// src/components/MangaLibrary.jsx
import React from 'react';
import { normalizeTitle } from '../utils/normalizeTitle';
import { getAccessToken } from '../utils/auth';

const STATUS_OPTIONS = [
  { value: 'plan',      label: 'Da leggere' },
  { value: 'reading',   label: 'In lettura' },
  { value: 'completed', label: 'Completato' },
  { value: 'paused',    label: 'In pausa' },
  { value: 'dropped',   label: 'Abbandonato' }
];

const STATUS_COLOR = {
  plan: '#6366f1',
  reading: '#22c55e',
  completed: '#f44336',
  dropped: '#9ca3af',
  paused: '#f59e0b'
};

export default function MangaLibrary({ user, setView, setSelectedManga, onLibraryChange }) {
  const [library, setLibrary] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [removing, setRemoving] = React.useState({});
  const [editing, setEditing] = React.useState({}); // key -> {status, volumes_owned, volumes_read}
  const [saving, setSaving] = React.useState({});

  React.useEffect(() => {
    if (!user?.id) return;
    fetchLibrary();
    // eslint-disable-next-line
  }, [user?.id]);

  async function fetchLibrary() {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/social/library', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch (e) { json = null; }
      if (!res.ok) {
        console.error('getUserLibrary error', text);
        setLibrary([]);
        return;
      }
      const raw = json?.library || [];
      const seen = new Set();
      const unique = raw.filter(i => {
        const k = i.manga_id || i.external_id || (i.manga && (i.manga.id || i.manga.external_id));
        if (!k) return false;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setLibrary(unique);
      onLibraryChange?.();
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
    if (!window.confirm('Rimuovere questo manga dalla libreria?')) return;

    const prev = library;
    setLibrary(prev.filter(i => i !== item));
    setRemoving(r => ({ ...r, [id]: true }));

    try {
      const token = await getAccessToken();
      const res = await fetch('/api/social/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'unfollow', manga_id: item.manga_id || item.manga?.id || null, external_id: item.external_id || item.manga?.external_id || null })
      });
      if (!res.ok) { alert('Impossibile rimuovere. Riprova.'); setLibrary(prev); return; }
      const json = await res.json();
      if (!json?.ok) { alert('Errore server.'); setLibrary(prev); }
      else onLibraryChange?.();
    } catch (err) {
      console.error('removeItem failed', err);
      alert('Errore di rete.');
      setLibrary(prev);
    } finally {
      setRemoving(r => { const c = { ...r }; delete c[id]; return c; });
    }
  }

  async function saveProgress(item, edits) {
    const key = item.id || item.manga_id || item.external_id;
    setSaving(s => ({ ...s, [key]: true }));
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/social/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'update',
          manga_id: item.manga_id || item.manga?.id || null,
          external_id: item.external_id || item.manga?.external_id || null,
          status: edits.status,
          volumes_owned: Number(edits.volumes_owned) || 0,
          volumes_read: Number(edits.volumes_read) || 0
        })
      });
      const json = await res.json();
      if (json?.ok) {
        setLibrary(prev => prev.map(i => (i === item ? { ...i, ...edits } : i)));
        setEditing(e => { const c = { ...e }; delete c[key]; return c; });
        onLibraryChange?.();
      } else {
        alert('Errore: ' + (json?.error || 'unknown'));
      }
    } catch (err) {
      alert('Errore di rete.');
    } finally {
      setSaving(s => { const c = { ...s }; delete c[key]; return c; });
    }
  }

  function openDetail(item) {
    const m = item.manga || { id: item.manga_id, external_id: item.external_id, source: item.source, title: item.title };
    const normalized = {
      id: m.id || m.external_id,
      external_id: m.external_id || m.id,
      source: m.source || 'anilist',
      origin: 'profile',
      title: normalizeTitle(m.title || m),
      cover_url: m.cover_url || m.coverImage?.large
    };
    if (typeof setSelectedManga === 'function') {
      setSelectedManga(normalized);
      setView?.('manga');
    }
  }

  function startEdit(item, key) {
    setEditing(e => ({
      ...e,
      [key]: {
        status: item.status || 'plan',
        volumes_owned: item.volumes_owned ?? 0,
        volumes_read: item.volumes_read ?? 0
      }
    }));
  }

  if (!user) return <div>Devi essere loggato.</div>;
  if (loading) return <div>Caricamento libreria...</div>;
  if (!library.length) return <div style={{ color: '#888' }}>La tua libreria è vuota. Cerca un manga in <em>Esplora</em> e aggiungilo!</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
      {library.map(item => {
        const m = item.manga || {};
        const title = normalizeTitle(m.title || m.title_raw || m);
        const cover = m.cover_url || m.coverImage?.large || '/placeholder-cover.png';
        const key = item.id || item.manga_id || item.external_id;
        const ed = editing[key];
        const isSaving = saving[key];
        const statusColor = STATUS_COLOR[item.status] || '#9ca3af';

        return (
          <article key={key} style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Cover */}
            <div
              onClick={() => openDetail(item)}
              style={{ height: 230, backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer', position: 'relative' }}
            >
              <span style={{
                position: 'absolute', bottom: 8, left: 8,
                padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                background: statusColor + 'dd', color: '#fff'
              }}>
                {STATUS_OPTIONS.find(s => s.value === item.status)?.label || item.status || '—'}
              </span>
            </div>

            {/* Info */}
            <div style={{ padding: '10px 10px 8px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{title}</div>

              {!ed ? (
                <>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {item.volumes_owned > 0 ? `${item.volumes_owned} vol. posseduti` : 'Nessun volume'}
                    {item.volumes_read > 0 ? ` · ${item.volumes_read} letti` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button onClick={() => openDetail(item)} style={{ flex: 1, padding: '5px 0', fontSize: 12 }}>Dettagli</button>
                    <button onClick={() => startEdit(item, key)} style={{ flex: 1, padding: '5px 0', fontSize: 12 }}>Modifica</button>
                    <button onClick={() => removeItem(item)} disabled={Boolean(removing[key])} style={{ padding: '5px 8px', fontSize: 12, color: '#e53e3e', border: '1px solid #fecaca', background: '#fff5f5' }}>
                      ✕
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <select
                    value={ed.status}
                    onChange={e => setEditing(prev => ({ ...prev, [key]: { ...ed, status: e.target.value } }))}
                    style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #eee', fontSize: 12 }}
                  >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <label style={{ flex: 1, fontSize: 11, color: '#666' }}>
                      Posseduti
                      <input type="number" min="0" value={ed.volumes_owned}
                        onChange={e => setEditing(prev => ({ ...prev, [key]: { ...ed, volumes_owned: e.target.value } }))}
                        style={{ width: '100%', padding: '3px 6px', marginTop: 2, border: '1px solid #eee', borderRadius: 4 }}
                      />
                    </label>
                    <label style={{ flex: 1, fontSize: 11, color: '#666' }}>
                      Letti
                      <input type="number" min="0" value={ed.volumes_read}
                        onChange={e => setEditing(prev => ({ ...prev, [key]: { ...ed, volumes_read: e.target.value } }))}
                        style={{ width: '100%', padding: '3px 6px', marginTop: 2, border: '1px solid #eee', borderRadius: 4 }}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => saveProgress(item, ed)} disabled={isSaving} style={{ flex: 1, padding: '5px 0', fontSize: 12, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6 }}>
                      {isSaving ? '…' : 'Salva'}
                    </button>
                    <button onClick={() => setEditing(e => { const c = { ...e }; delete c[key]; return c; })} style={{ flex: 1, padding: '5px 0', fontSize: 12 }}>
                      Annulla
                    </button>
                  </div>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
