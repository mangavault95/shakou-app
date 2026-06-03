// src/components/Header.jsx
import React from 'react';

export default function Header({ user, onLogout, onOpenSearch }) {
  return (
    <header style={{
      height: 64,
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #eee',
      marginLeft: 220, // lascia spazio alla sidebar fissa
      background: '#fff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontWeight: 700 }}>Shakou</div>
        <button onClick={onOpenSearch} style={{ padding: '6px 10px' }}>Cerca</button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ color: '#666', fontSize: 13 }}>{user?.email ? user.email.split('@')[0] : 'Guest'}</div>
        <button onClick={onLogout} style={{ padding: '6px 10px' }}>Sign out</button>
      </div>
    </header>
  );
}
