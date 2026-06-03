// src/components/Sidebar.jsx
import React from 'react';

export default function Sidebar({ setView }) {
  return (
    <nav style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <button onClick={() => setView && setView('dashboard')}>Dashboard</button>
      <button onClick={() => setView && setView('profile')}>Profilo</button>
      <button onClick={() => setView && setView('explore')}>Esplora</button>
      { /* rimuovi duplicati come "Vai a Esplora" a destra */ }
      <button onClick={() => setView && setView('admin')}>Admin</button>
      <button onClick={() => setView && setView('settings')}>Impostazioni</button>
    </nav>
  );
}
