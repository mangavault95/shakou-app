import React from 'react';

export default function Sidebar({ onNavigate }) {
  return (
    <aside style={{
      width:220, borderRight:'1px solid #eee', padding:16, background:'#fafafa', minHeight:'calc(100vh - 64px)'
    }}>
      <div style={{ marginBottom:16, fontWeight:700 }}>Menu</div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <button onClick={() => onNavigate('dashboard')} style={{ textAlign:'left', padding:8 }}>Dashboard</button>
        <button onClick={() => onNavigate('home')} style={{ textAlign:'left', padding:8 }}>Profilo</button>
        <button onClick={() => onNavigate('explore')} style={{ textAlign:'left', padding:8 }}>Esplora</button>
        <button onClick={() => onNavigate('admin')} style={{ textAlign:'left', padding:8 }}>Admin</button>
        <button onClick={() => onNavigate('settings')} style={{ textAlign:'left', padding:8 }}>Impostazioni</button>
      </div>
    </aside>
  );
}
