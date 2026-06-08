import React from 'react';
import { supabase } from '../supabase';

export default function Admin() {
  const [profiles, setProfiles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [emailToAdd, setEmailToAdd] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState(false);

  React.useEffect(() => {
    fetchAllProfiles();
  }, []);

  async function fetchAllProfiles() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,created_at')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) return console.log('fetchAllProfiles', error.message);
    setProfiles(data || []);
  }

  async function changeRole(id, newRole) {
    setActionLoading(true);
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    setActionLoading(false);
    if (error) return alert('Errore: ' + error.message);
    fetchAllProfiles();
  }

  async function addAdminByEmail(e) {
    e?.preventDefault();
    if (!emailToAdd) return alert('Inserisci un indirizzo email.');
    setActionLoading(true);

    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('id,email')
      .eq('email', emailToAdd)
      .single();

    if (profErr) {
      setActionLoading(false);
      return alert('Profilo non trovato: ' + profErr.message);
    }

    const { error: insertErr } = await supabase
      .from('admins')
      .insert([{ user_id: prof.id }]);

    setActionLoading(false);
    if (insertErr) return alert('Errore promozione admin: ' + insertErr.message);

    await supabase.from('profiles').update({ role: 'admin' }).eq('id', prof.id);

    setEmailToAdd('');
    fetchAllProfiles();
    alert('Utente promosso ad admin.');
  }

  async function removeAdmin(userId) {
    if (!confirm('Rimuovere questo admin?')) return;
    setActionLoading(true);
    const { error } = await supabase.from('admins').delete().eq('user_id', userId);
    setActionLoading(false);
    if (error) return alert('Errore rimozione admin: ' + error.message);
    await supabase.from('profiles').update({ role: 'user' }).eq('id', userId);
    fetchAllProfiles();
  }

  if (loading) return <div style={{padding:20}}>Caricamento admin...</div>;

  const usersCount = profiles.length;
  const adminsCount = profiles.filter(p => p.role === 'admin').length;

  return (
    <div style={{ maxWidth:900, margin:'40px auto', padding:20 }}>
      <h2>Admin Console</h2>

      <div style={{ display:'flex', gap:12, marginBottom:20 }}>
        <div style={{ flex:1, padding:16, border:'1px solid #eee', borderRadius:8 }}>
          <div style={{ color:'#666' }}>Utenti registrati</div>
          <div style={{ fontSize:24, fontWeight:700 }}>{usersCount}</div>
        </div>
        <div style={{ flex:1, padding:16, border:'1px solid #eee', borderRadius:8 }}>
          <div style={{ color:'#666' }}>Admin</div>
          <div style={{ fontSize:24, fontWeight:700 }}>{adminsCount}</div>
        </div>
      </div>

      <form onSubmit={addAdminByEmail} style={{ marginBottom:16 }}>
        <input
          type="email"
          placeholder="Email da promuovere ad admin"
          value={emailToAdd}
          onChange={e => setEmailToAdd(e.target.value)}
          style={{ padding:8, width:320, marginRight:8 }}
        />
        <button type="submit" disabled={actionLoading} style={{ padding:8 }}>
          {actionLoading ? 'Elaborazione...' : 'Promuovi ad admin'}
        </button>
      </form>

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
                {p.role !== 'user' && <button onClick={() => changeRole(p.id, 'user')} style={{ marginRight:8 }}>Rendi user</button>}
                <button onClick={() => removeAdmin(p.id)} style={{ marginLeft:8 }}>Rimuovi admin</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
