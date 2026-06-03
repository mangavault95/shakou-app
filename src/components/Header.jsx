import React from 'react';
import { supabase } from '../supabase';

export default function Header({ user, onNavigate }) {
  async function signOut() {
    await supabase.auth.signOut();
    // onNavigate('login') non necessario: auth listener in App gestisce lo stato
  }

  return (
    <header style={{
      display:'flex', justifyContent:'space-between', alignItems:'center',
      padding:'12px 20px', borderBottom:'1px solid #eee', background:'#fff'
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ fontWeight:700, fontSize:18 }}>Shakou</div>
        <nav style={{ display:'flex', gap:8 }}>
          <button onClick={() => onNavigate('dashboard')} style={{ padding:8 }}>Dashboard</button>
          <button onClick={() => onNavigate('home')} style={{ padding:8 }}>Profilo</button>
          <button onClick={() => onNavigate('admin')} style={{ padding:8 }}>Admin</button>
        </nav>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ textAlign:'right', fontSize:13 }}>
          <div style={{ fontWeight:600 }}>{user?.user_metadata?.full_name || user?.email}</div>
          <div style={{ color:'#666' }}>{user?.id?.slice(0,8)}</div>
        </div>
        <button onClick={signOut} style={{ padding:'8px 12px' }}>Sign out</button>
      </div>
    </header>
  );
}
