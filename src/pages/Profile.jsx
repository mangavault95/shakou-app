import React from 'react';
import MangaLibrary from '../components/MangaLibrary';
import Header from '../components/Header';

export default function Profile({ user, setView }) {
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
          <h2 style={{ margin: 0 }}>{user.user_metadata?.full_name || user.email || 'Utente'}</h2>
          <div style={{ color: '#666', fontSize: 13, marginTop: 6 }}>ID: {user.id}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView && setView('explore')}>Esplora</button>
          <button onClick={() => setView && setView('dashboard')}>Dashboard</button>
        </div>
      </div>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ marginTop: 0 }}>La tua Libreria</h3>
        <MangaLibrary user={user} />
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
