import React from 'react';
import { supabase } from '../supabase';

export default function Login() {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function signInWithEmail(e) {
    e?.preventDefault();
    if (!email) return alert('Inserisci un indirizzo email valido.');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://project-88urw.vercel.app' }
    });
    setLoading(false);
    if (error) return alert(error.message);
    alert('Controlla la tua email per il link di accesso.');
  }

  async function signInWithGitHub() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: 'https://project-88urw.vercel.app' }
    });
    setLoading(false);
    if (error) console.error('OAuth error', error.message);
  }

  return (
    <div style={{ maxWidth:420, margin:'40px auto', padding:20, border:'1px solid #ddd', borderRadius:8 }}>
      <h2>Accedi a Shakou</h2>

      <form onSubmit={signInWithEmail} style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ padding:10, fontSize:16 }}
        />
        <button type="submit" disabled={loading} style={{ padding:10 }}>
          {loading ? 'Invio...' : 'Invia link di accesso'}
        </button>
      </form>

      <div style={{ marginTop:16, textAlign:'center' }}>
        <div style={{ marginBottom:8 }}>oppure</div>
        <button onClick={signInWithGitHub} style={{ padding:10 }}>
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
