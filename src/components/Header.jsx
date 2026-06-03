import React from 'react';
import { supabase } from '../supabase';

export default function Header({ user }) {
  const [displayName, setDisplayName] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    async function fetchProfileName() {
      if (!user?.id) { setDisplayName(''); return; }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name,email')
          .eq('id', user.id)
          .single();
        if (error) { if (mounted) setDisplayName(user.email ?? ''); return; }
        if (mounted) setDisplayName(data?.full_name || data?.email || user.email || '');
      } catch (e) { if (mounted) setDisplayName(user.email || ''); }
    }
    fetchProfileName();
    return () => { mounted = false; };
  }, [user]);

  async function signOut() { await supabase.auth.signOut(); }

  return (
    <header style={{
      display:'flex', justifyContent:'space-between', alignItems:'center',
      padding:'12px 20px', borderBottom:'1px solid #eee', background:'#fff'
    }}>
      <div style={{ fontWeight:700, fontSize:18 }}>Shakou</div>

      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ textAlign:'right', fontSize:13 }}>
          <div style={{ fontWeight:600 }}>{displayName || user.email}</div>
          <div style={{ color:'#666' }}>{user?.id?.slice(0,8)}</div>
        </div>
        <button onClick={signOut} style={{ padding:'8px 12px' }}>Sign out</button>
      </div>
    </header>
  );
}
