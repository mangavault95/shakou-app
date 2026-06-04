// src/pages/Settings.jsx
import React from 'react';

export default function Settings({ user }) {
  return (
    <div style={{ padding: 20 }}>
      <h2>Impostazioni</h2>
      <p>Qui puoi gestire le impostazioni del tuo account.</p>

      <section style={{ marginTop: 16 }}>
        <h3>Account</h3>
        <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
          <div><strong>Email:</strong> {user?.email || 'Non loggato'}</div>
          <div style={{ marginTop: 8 }}>
            <button style={{ padding: '8px 12px' }} onClick={() => alert('Qui metti la logica per cambiare impostazioni')}>
              Modifica impostazioni
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
