import React from 'react';
import { supabase } from '../supabase';

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = React.useState({ users: 0, admins: 0 });
  const [recent, setRecent] = React.useState([]);

  React.useEffect(() => {
    fetchStats();
    fetchRecent();
  }, []);

  async function fetchStats() {
    // conteggi semplici: users totali e admins
    const { count: usersCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    const { count: adminsCount } = await supabase.from('admins').select('user_id', { count: 'exact', head: true });
    setStats({ users: usersCount || 0, admins: adminsCount || 0 });
  }

  async function fetchRecent() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,created_at')
      .order('created_at', { ascending: false })
      .limit(6);
    if (error) return console.log('fetchRecent', error.message);
    setRecent(data || []);
  }

  return (
    <div style={{ padding:20 }}>
      <h2>Panoramica</h2>

      <div style={{ display:'flex', gap:12, marginBottom:20 }}>
        <div style={{ flex:1, padding:16, border:'1px solid #eee', borderRadius:8 }}>
          <div style={{ color:'#666' }}>Utenti registrati</div>
          <div style={{ fontSize:24, fontWeight:700 }}>{stats.users}</div>
        </div>
        <div style={{ flex:1, padding:16, border:'1px solid #eee', borderRadius:8 }}>
          <div style={{ color:'#666' }}>Admin</div>
          <div style={{ fontSize:24, fontWeight:700 }}>{stats.admins}</div>
        </div>
        <div style={{ flex:1, padding:16, border:'1px solid #eee', borderRadius:8 }}>
          <div style={{ color:'#666' }}>Azioni rapide</div>
          <div style={{ marginTop:8 }}>
            <button onClick={() => onNavigate('admin')} style={{ padding:8 }}>Apri Admin Console</button>
          </div>
        </div>
      </div>

      <section>
        <h3>Utenti recenti</h3>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign:'left', padding:8 }}>Email</th>
              <th style={{ textAlign:'left', padding:8 }}>Nome</th>
              <th style={{ textAlign:'left', padding:8 }}>Iscritto</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(r => (
              <tr key={r.id} style={{ borderTop:'1px solid #eee' }}>
                <td style={{ padding:8 }}>{r.email}</td>
                <td style={{ padding:8 }}>{r.full_name || '—'}</td>
                <td style={{ padding:8 }}>{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
