// src/components/MangaEditions.jsx
import React from 'react';
import { getAccessToken } from '../utils/auth';

function lsKey(source, externalId) {
  return `edition_${source}_${externalId}`;
}

export default function MangaEditions({ source, externalId, user, title, titleEn, volumesCount, onEditionSelect, selectedEdition }) {
  const [editionsByName, setEditionsByName] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  // Inizializza dall'eventuale prop passata dal genitore, poi da localStorage
  const [activeEdition, setActiveEdition] = React.useState(() => {
    if (selectedEdition) return selectedEdition;
    try { return localStorage.getItem(lsKey(source, externalId)) || null; } catch { return null; }
  });

  React.useEffect(() => {
    if (!source || !externalId || (!title && !titleEn)) return;
    setEditionsByName(null);
    setLoading(true);
    const params = new URLSearchParams({ fetch: '1', source: String(source), external_id: String(externalId) });
    if (title) params.set('title', title);
    if (titleEn) params.set('title_en', titleEn);
    if (volumesCount) params.set('volumes_count', String(volumesCount));
    fetch(`/api/editions?${params.toString()}`)
      .then(r => r.json())
      .then(j => {
        const data = j.editions_by_name || {};
        setEditionsByName(data);
        const names = Object.keys(data);
        if (!names.length) return;
        // Preferenza: selectedEdition prop → localStorage → Standard → primo disponibile
        let saved = null;
        try { saved = localStorage.getItem(lsKey(source, externalId)); } catch {}
        const init = (selectedEdition && data[selectedEdition])
          ? selectedEdition
          : (saved && data[saved])
            ? saved
            : (data['Standard'] ? 'Standard' : names[0]);
        setActiveEdition(init);
        onEditionSelect?.(init, data[init] || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, externalId, title, titleEn]);

  // Chiude il menu se si clicca fuori
  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close, { once: true });
    return () => document.removeEventListener('click', close);
  }, [open]);

  async function selectEdition(name) {
    setActiveEdition(name);
    setOpen(false);
    // Persistenza localStorage (tutti i visitatori)
    try { localStorage.setItem(lsKey(source, externalId), name); } catch {}
    // Persistenza DB (solo utenti loggati con manga in libreria)
    if (user) {
      try {
        const token = await getAccessToken();
        await fetch('/api/social/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'update', external_id: String(externalId), source, edition_name: name })
        });
      } catch {}
    }
    onEditionSelect?.(name, editionsByName?.[name] || []);
  }

  if (loading) return <div style={{ fontSize: 13, color: '#888', marginTop: 12 }}>Ricerca edizioni italiane…</div>;
  if (!editionsByName) return null;

  const editionNames = Object.keys(editionsByName);
  if (!editionNames.length) return null;

  const currentVols = activeEdition ? (editionsByName[activeEdition] || []) : [];
  const publisher = currentVols.find(v => v.publisher)?.publisher || null;
  const prices = currentVols.map(v => v.price).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;

  return (
    <div style={{ marginTop: 14, padding: '12px 14px', background: '#f8f9fa', borderRadius: 10, border: '1px solid #e9ecef' }}>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
        Edizione italiana
      </div>

      {/* Selezione edizione */}
      {editionNames.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {editionNames.map(name => {
            const vols = editionsByName[name] || [];
            const pp = vols.map(v => v.price).filter(Boolean);
            const pMin = pp.length ? Math.min(...pp) : null;
            const pMax = pp.length ? Math.max(...pp) : null;
            const isActive = name === activeEdition;
            return (
              <button
                key={name}
                onClick={e => { e.stopPropagation(); selectEdition(name); }}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  border: isActive ? '2px solid #6366f1' : '1px solid #dee2e6',
                  background: isActive ? '#f0f0ff' : '#fff',
                  color: isActive ? '#6366f1' : '#444',
                  fontWeight: isActive ? 700 : 500,
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
                  textAlign: 'left',
                }}
              >
                <span>{name}</span>
                {pMin !== null && (
                  <span style={{ fontSize: 11, color: isActive ? '#6366f1aa' : '#888', fontWeight: 400 }}>
                    {pMin === pMax ? `€ ${pMin.toFixed(2)}` : `€ ${pMin.toFixed(2)}–${pMax.toFixed(2)}`}
                    {' · '}{vols.length} vol.
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Info edizione attiva */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: currentVols.length ? 8 : 0 }}>
        {publisher && <span style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>{publisher}</span>}
        {activeEdition && activeEdition !== 'Standard' && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 999,
            background: '#6366f122', color: '#6366f1', fontWeight: 700, border: '1px solid #6366f144'
          }}>{activeEdition}</span>
        )}
        {minPrice !== null && (
          <span style={{ fontSize: 13, color: '#444' }}>
            {minPrice === maxPrice
              ? `€ ${minPrice.toFixed(2)} / vol.`
              : `€ ${minPrice.toFixed(2)} – ${maxPrice.toFixed(2)} / vol.`}
          </span>
        )}
        {currentVols.length > 0 && (
          <span style={{ fontSize: 12, color: '#888' }}>· {currentVols.length} {currentVols.length === 1 ? 'volume' : 'volumi'}</span>
        )}
      </div>

      {currentVols.length > 0 && <VolumeList vols={currentVols} />}
    </div>
  );
}

function VolumeList({ vols }) {
  const [expanded, setExpanded] = React.useState(false);
  const show = expanded ? vols : vols.slice(0, 5);

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 4 }}>
        {show.map(v => (
          <div key={v.volume_number} style={{
            padding: '4px 8px', background: '#fff', borderRadius: 6,
            border: '1px solid #e9ecef', fontSize: 12
          }}>
            <span style={{ fontWeight: 600, color: '#444' }}>Vol. {v.volume_number}</span>
            {v.price != null && <span style={{ color: '#666', marginLeft: 4 }}>€ {Number(v.price).toFixed(2)}</span>}
          </div>
        ))}
      </div>
      {vols.length > 5 && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ marginTop: 6, fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {expanded ? '▲ Mostra meno' : `▼ Mostra tutti i ${vols.length} volumi`}
        </button>
      )}
    </div>
  );
}
