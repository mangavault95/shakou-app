import React from 'react';
import { supabase } from '../supabase';

export default function Login({ onLogin }) {
  const [email, setEmail] = React.useState('');

  async function signIn() {
    const { data, error } = await supabase.auth.signInWithOtp({ email });
    if (error) return alert(error.message);
    alert('Controlla la tua email per il link di accesso.');
  }

  return (
    <div style={{padding:20}}>
      <h2>Accedi a Shakou</h2>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
      <button onClick={signIn}>Invia link di accesso</button>
    </div>
  );
}
