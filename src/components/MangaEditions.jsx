// src/components/MangaEditions.jsx
// Mostra le edizioni italiane disponibili per un manga con prezzi per volume.
// Se ci sono più edizioni, offre un selettore a comparsa.
import React from 'react';
import { getAccessToken } from '../utils/auth';

export default function MangaEditions({ source, externalId, user, title, titleEn, volumesCount, onEditionSelect, selectedEdition }) {
  const [editionsByName, setEditionsByName] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [activeEdition, setActiveEdition] = React.useState(selectedEdition || null);

  React.useEffect(() => {
    if (!source || !externalId) return;
    // Aspetta che il titolo arrivi da AniList: serve al backend per lo
    // scraping al primo caricamento (su cache mancante).
    if (!title && !titleEn) return;
    setEditionsByName(null);
    setLoading(true);
    // ?fetch=1 popola la cache da Google Books + AnimeClick (se vuota) e
    // restituisce le edizioni in un'unica chiamata, evitando race condition.
    const params = new URLSearchParams({ fetch: '1', source: String(source), external_id: String(externalId) });
    if (title) params.set('title', title);
    if (titleEn) params.set('title_en', titleEn);
    if (volumesCount) params.set('volumes_count', String(volumesCount));
    fetch(`/api/editions?${params.toString()}`)
      .then(r => r.json())
      .then(j => {
        const data = j.editions_by_name || {};
        setEditionsByName(data);
        // Seleziona automaticamente l'edizione attiva (preferenza: selectedEdition prop, poi Standard, poi prima disponibile)
        const names = Object.keys(data);
        if (names.length === 0) return;
        const defaultEd = selectedEdition && data[selectedEdition]
          ? selectedEdition
          : (data['Standard'] ? 'Standard' : names[0]);
        setActiveEdition(defaultEd);
        onEditionSelect?.(defaultEd, data[defaultEd] || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, externalId, title, titleEn]);

  if (loading) return <div style={{ fontSize: 13, color: '#888', marginTop: 12 }}>Ricerca edizioni italiane…</div>;
  if (!editionsByName) return null;

  const editionNames = Object.keys(editionsByName);
  if (!editionNames.length) return null;

  const currentVols = activeEdition ? (editionsByName[activeEdition] || []) : [];
  const publisher = currentVols.find(v => v.publisher)?.publisher || null;
  const prices = currentVols.map(v => v.price).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const hasMultipleEditions = editionNames.length > 1;

  function selectEdition(name) {
    setActiveEdition(name);
    setOpen(false);
    onEditionSelect?.(name, editionsByName[name] || []);
  }

  return (
    <div style={{ marginTop: 14, padding: '12px 14px', background: '#f8f9fa', borderRadius: 10, border: '1px solid #e9ecef' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Etichetta edizione attiva */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
            Edizione italiana
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {publisher && (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>{publisher}</span>
            )}
            {activeEdition && activeEdition !== 'Standard' && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 999,
                background: '#6366f122', color: '#6366f1', fontWeight: 700, border: '1px solid #6366f144'
              }}>
                {activeEdition}
              </span>
            )}
            {minPrice !== null && (
              <span style={{ fontSize: 13, color: '#444' }}>
                {minPrice === maxPrice
                  ? `€ ${minPrice.toFixed(2)} / vol.`
                  : `€ ${minPrice.toFixed(2)} – ${maxPrice.toFixed(2)} / vol.`}
              </span>
            )}
            {currentVols.length > 0 && (
              <span style={{ fontSize: 12, color: '#888' }}>
                · {currentVols.length} {currentVols.length === 1 ? 'volume' : 'volumi'}
              </span>
            )}
          </div>
        </div>

        {/* Bottone cambio edizione (solo se più di una) */}
        {hasMultipleEditions && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setOpen(o => !o)}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid #dee2e6',
                background: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
              }}
            >
              Cambia edizione <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
            </button>

            {open && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 100,
                background: '#fff', border: '1px solid #dee2e6', borderRadius: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,.12)', minWidth: 260, overflow: 'hidden'
              }}>
                {editionNames.map(name => {
                  const vols = editionsByName[name] || [];
                  const pub = vols.find(v => v.publisher)?.publisher || '—';
                  const pp = vols.map(v => v.price).filter(Boolean);
                  const pMin = pp.length ? Math.min(...pp) : null;
                  const pMax = pp.length ? Math.max(...pp) : null;
                  const isActive = name === activeEdition;
                  return (
                    <button
                      key={name}
                      onClick={() => selectEdition(name)}
                      style={{
                        display: 'block', width: '100%', padding: '10px 14px',
                        textAlign: 'left', background: isActive ? '#f8f9ff' : '#fff',
                        border: 'none', borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer', transition: 'background .15s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: isActive ? 700 : 600, fontSize: 14 }}>{name}</span>
                          <span style={{ fontSize: 12, color: '#888', marginLeft: 6 }}>{pub}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#666', textAlign: 'right' }}>
                          {pMin !== null
                            ? (pMin === pMax ? `€ ${pMin.toFixed(2)}` : `€ ${pMin.toFixed(2)}–${pMax.toFixed(2)}`)
                            : '—'}
                          <div style={{ color: '#aaa' }}>{vols.length} vol.</div>
                        </div>
                      </div>
                      {isActive && <div style={{ fontSize: 10, color: '#6366f1', marginTop: 2 }}>✓ Selezionata</div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista volumi con prezzo — collassabile */}
      {currentVols.length > 0 && (
        <VolumeList vols={currentVols} />
      )}
    </div>
  );
}

function VolumeList({ vols }) {
  const [expanded, setExpanded] = React.useState(false);
  const show = expanded ? vols : vols.slice(0, 5);

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: 4
      }}>
        {show.map(v => (
          <div key={v.volume_number} style={{
            padding: '4px 8px', background: '#fff', borderRadius: 6,
            border: '1px solid #e9ecef', fontSize: 12
          }}>
            <span style={{ fontWeight: 600, color: '#444' }}>Vol. {v.volume_number}</span>
            {v.price != null && (
              <span style={{ color: '#666', marginLeft: 4 }}>€ {Number(v.price).toFixed(2)}</span>
            )}
          </div>
        ))}
      </div>
      {vols.length > 5 && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            marginTop: 6, fontSize: 12, color: '#6366f1',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0
          }}
        >
          {expanded ? '▲ Mostra meno' : `▼ Mostra tutti i ${vols.length} volumi`}
        </button>
      )}
    </div>
  );
}
