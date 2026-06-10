// src/components/Sidebar.jsx
import React from 'react';
import useIsMobile from '../hooks/useIsMobile';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Home',    icon: '⌂' },
  { key: 'explore',   label: 'Esplora', icon: '🔍' },
];

export default function Sidebar({ setView, currentView, mobileOpen, onClose }) {
  const isMobile = useIsMobile();

  function navigate(key) {
    setView(key);
    if (isMobile) onClose?.();
  }

  if (isMobile && !mobileOpen) return null;

  return (
    <>
      {isMobile && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(20,10,40,0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 4000
          }}
        />
      )}

      <aside style={{
        width: 220,
        minHeight: '100vh',
        padding: '20px 12px',
        boxSizing: 'border-box',
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        position: 'fixed',
        left: 0, top: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        zIndex: 4100,
        boxShadow: isMobile ? 'var(--shadow)' : 'none',
      }}>
        {/* Logo / titolo */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 8px', marginBottom: 20
        }}>
          <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--accent)', letterSpacing: '-0.5px' }}>
            Shakou
          </span>
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: 'var(--muted)',
                fontSize: 20, lineHeight: 1, padding: 4, cursor: 'pointer'
              }}
            >✕</button>
          )}
        </div>

        {/* Voci di navigazione */}
        {NAV_ITEMS.map(it => {
          const active = currentView === it.key;
          return (
            <button
              key={it.key}
              onClick={() => navigate(it.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                borderRadius: 10,
                border: 'none',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text)',
                fontWeight: active ? 700 : 500,
                fontSize: 15,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background .15s, color .15s',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1, opacity: active ? 1 : 0.7 }}>{it.icon}</span>
              {it.label}
            </button>
          );
        })}

        {/* Separatore + versione in fondo */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', letterSpacing: '.04em' }}>
            Shakou · beta
          </div>
        </div>
      </aside>
    </>
  );
}
