// src/pages/Profile.jsx
import React from 'react';
import MangaLibrary from '../components/MangaLibrary';
import Header from '../components/Header';

function formatDisplayName(user) {
  const metaName = user?.user_metadata?.full_name;
  if (metaName) return metaName;
  const email = user?.email || '';
  if (!email) return 'Utente';
  const local = email.split('@')[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default function Profile({ user, setView, setSelectedManga }) {
  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Profilo</h2>
        <p>Devi essere loggato per vedere il profilo.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0 }}>{formatDisplayName(user)}</h2>
          <div style={{ color: '#666', fontSize: 13, marginTop: 6 }}>Email: {user.email}</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView && setView('explore')}>Vai a Esplora</button>
          <button onClick={() => setView && setView('dashboard')}>Vai a Dashboard</button>
        </div>
      </div>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ marginTop: 0 }}>La tua Libreria</h3>
        <MangaLibrary user={user} setView={setView} setSelectedManga={setSelectedManga} />
      </section>

      <section style={{ marginTop: 28 }}>
        <h3>Impostazioni</h3>
        <div style={{ color: '#666', fontSize: 14 }}>
          <div>Email: <strong style={{ color: '#222' }}>{user.email}</strong></div>
          <div style={{ marginTop: 8 }}>Puoi gestire le tue preferenze qui in futuro.</div>
        </div>
      </section>
    </div>
  );
}
