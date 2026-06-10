// src/components/Sidebar.jsx
import React from 'react';
import useIsMobile from '../hooks/useIsMobile';

export default function Sidebar({ setView, currentView, mobileOpen, onClose }) {
  const isMobile = useIsMobile();

  const items = [
    { key: 'dashboard', label: 'Home' },
    { key: 'explore', label: 'Esplora' }
  ];

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
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            zIndex: 4000
          }}
        />
      )}
      <aside style={{
        width: 220,
        minHeight: '100vh',
        padding: 16,
        boxSizing: 'border-box',
        borderRight: '1px solid #eee',
        background: '#fff',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 4100,
        transform: isMobile && !mobileOpen ? 'translateX(-100%)' : 'none',
        transition: 'transform 0.25s ease'
      }}>
        <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Menu
          {isMobile && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
          )}
        </div>

        {items.map(it => (
          <button
            key={it.key}
            onClick={() => navigate(it.key)}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              background: currentView === it.key ? '#f44336' : '#fff',
              color: currentView === it.key ? '#fff' : '#222',
              cursor: 'pointer'
            }}
          >
            {it.label}
          </button>
        ))}
      </aside>
    </>
  );
}
