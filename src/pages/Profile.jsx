import React from 'react';
import { supabase } from '../supabase';

export default function Profile({ user }) {
  const [loading, setLoading] = React.useState(false);
  const [profile, setProfile] = React.useState({ email: '', full_name: '', role: 'user' });
  const [editing, setEditing] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    if (!user?.id) return;
    fetchProfile();
  }, [user]);

  async function fetchProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,role')
      .eq('id', user.id)
      .single();
    if (error) {
      console.log('fetchProfile error', error.message);
      return;
    }
    setProfile({ email: data.email, full_name: data.full_name, role: data.role });
    setIsAdmin(data.role === 'admin');
  }

  async function saveProfile(e) {
    e?.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name
    }).eq('id', user.id);
    setLoading(false);
    if (error) return alert('Errore salvataggio: ' + error.message);
    setEditing(false);
    alert('Profilo aggiornato.');
  }

  return (
    <div style={{ maxWidth:720, margin:'40px auto', padding:20 }}>
      <h2>Benvenuto</h2>

      <div style={{ marginBottom:12 }}>
        <strong>Email:</strong> <span style={{ marginLeft:8 }}>{profile.email}</span>
      </div>

      <form onSubmit={saveProfile}>
        <div style={{ marginBottom:12 }}>
          <strong>Nome:</strong>
          {!editing ? (
            <span style={{ marginLeft:8 }}>{profile.full_name || '—'}</span>
          ) : (
            <input
              value={profile.full_name || ''}
              onChange={e => setProfile({ ...profile, full_name: e.target.value })}
              style={{ marginLeft:8, padding:6 }}
            />
          )}
        </div>

        <div style={{ marginBottom:12 }}>
          <strong>Ruolo:</strong> <span style={{ marginLeft:8 }}>{profile.role}</span>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          {!editing ? (
            <button type="button" onClick={() => setEditing(true)} style={{ padding:10 }}>Modifica profilo</button>
          ) : (
            <>
              <button type="submit" disabled={loading} style={{ padding:10 }}>
                {loading ? 'Salvataggio...' : 'Salva'}
              </button>
              <button type="button" onClick={() => setEditing(false)} style={{ padding:10 }}>Annulla</button>
            </>
          )}
        </div>
      </form>

      {isAdmin && (
        <div style={{ marginTop:24 }}>
          <strong>Sei admin</strong>
        </div>
      )}
    </div>
  );
}
