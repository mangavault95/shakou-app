// src/components/Sidebar.jsx
import React from 'react';

export default function Sidebar({ setView, currentView }) {
  const items = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'profile', label: 'Profilo' },
    { key: 'explore', label: 'Esplora' },
    { key: 'admin', label: 'Admin' },
    { key: 'settings', label: 'Impostazioni' }
  ];

  return (
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
      gap: 10
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Menu</div>

      {items.map(it => (
        <button
          key={it.key}
          onClick={() => setView(it.key)}
          style={{
            textAlign: 'left',
            padding: '10px 12px',
            borderRadius: 8,
            border: 'none',
            background: currentView === it.key ? '#f44336' : '#fff',
            color: currentView === it.key ? '#fff' : '#222',
            cursor: 'pointer',
            transition: '0.15s'
          }}
        >
          {it.label}
        </button>
      ))}
    </aside>
  );
}
