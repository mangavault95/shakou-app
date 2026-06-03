import React from 'react';
import { supabase } from '../supabase';

export default function Login() {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) return alert(error.message);
    alert('Controlla la tua email per il link di accesso.');
  }

  return (
    <div style={{padding:20}}>
      <h2>Accedi a Shakou</h2>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
      <button onClick={signIn} disabled={loading}>{loading ? 'Invio...' : 'Invia link di accesso'}</button>
    </div>
  );
}
