import React from 'react';
import { supabase } from '../supabase';

export default function Admin() {
  const [profiles, setProfiles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchAllProfiles();
  }, []);

  async function fetchAllProfiles() {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('id,email,full_name,role').order('created_at', { ascending: false });
    setLoading(false);
    if (error) return console.log('fetchAllProfiles', error.message);
    setProfiles(data || []);
  }

  async function changeRole(id, newRole) {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    if (error) return alert('Errore: ' + error.message);
    fetchAllProfiles();
  }

  if (loading) return <div style={{padding:20}}>Caricamento admin...</div>;

  return (
    <div style={{ maxWidth:900, margin:'40px auto', padding:20 }}>
      <h2>Admin Console</h2>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign:'left', padding:8 }}>Email</th>
            <th style={{ textAlign:'left', padding:8 }}>Nome</th>
            <th style={{ textAlign:'left', padding:8 }}>Ruolo</th>
            <th style={{ textAlign:'left', padding:8 }}>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map(p => (
            <tr key={p.id} style={{ borderTop:'1px solid #eee' }}>
              <td style={{ padding:8 }}>{p.email}</td>
              <td style={{ padding:8 }}>{p.full_name}</td>
              <td style={{ padding:8 }}>{p.role}</td>
              <td style={{ padding:8 }}>
                {p.role !== 'admin' && <button onClick={() => changeRole(p.id, 'admin')} style={{ marginRight:8 }}>Rendi admin</button>}
                {p.role !== 'user' && <button onClick={() => changeRole(p.id, 'user')}>Rendi user</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
