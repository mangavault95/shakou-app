import React from 'react';
import { supabase } from '../supabase';

export default function Profile({ user }) {
  const [loading, setLoading] = React.useState(false);

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  }

  return (
    <div style={{ maxWidth:720, margin:'40px auto', padding:20 }}>
      <h2>Benvenuto</h2>
      <div style={{ marginBottom:12 }}>
        <strong>Email:</strong> {user.email}
      </div>
      <div style={{ marginBottom:12 }}>
        <strong>UID:</strong> {user.id}
      </div>
      <button onClick={signOut} disabled={loading} style={{ padding:10 }}>
        {loading ? 'Uscita...' : 'Sign out'}
      </button>
    </div>
  );
}
