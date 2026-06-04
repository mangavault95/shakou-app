// src/pages/Login.jsx
import React from 'react';
import { supabase } from '../supabase';

export default function Login({ setUser, setView }) {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState(null);

  // Legge la sessione al mount (utile quando si torna dal magic link / OAuth)
  React.useEffect(() => {
    let mounted = true;
    async function checkSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data?.session?.user) {
          setUser && setUser(data.session.user);
          setView && setView('profile');
        }
      } catch (err) {
        console.error('checkSession error', err);
      }
    }
    checkSession();

    // listener per cambi di auth (opzionale ma utile)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser && setUser(session.user);
        setView && setView('profile');
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [setUser, setView]);

  async function signInWithEmail(e) {
    e?.preventDefault();
    if (!email) return alert('Inserisci un indirizzo email valido.');
    setLoading(true);
    setMessage(null);

    try {
      const redirectTo = process.env.VITE_APP_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo }
      });
      if (error) {
        console.error('signInWithEmail error', error);
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'info', text: 'Controlla la tua email per il link di accesso.' });
      }
    } catch (err) {
      console.error('signInWithEmail exception', err);
      setMessage({ type: 'error', text: 'Errore durante l\'invio. Riprova.' });
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGitHub() {
    setLoading(true);
    setMessage(null);
    try {
      const redirectTo = process.env.VITE_APP_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo }
      });
      if (error) {
        console.error('OAuth error', error);
        setMessage({ type: 'error', text: error.message || 'Errore OAuth' });
      } else {
        setMessage({ type: 'info', text: 'Reindirizzamento a GitHub...' });
      }
    } catch (err) {
      console.error('signInWithGitHub exception', err);
      setMessage({ type: 'error', text: 'Errore OAuth. Riprova.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth:420, margin:'40px auto', padding:20, border:'1px solid #ddd', borderRadius:8, background:'#fff' }}>
      <h2>Accedi a Shakou</h2>

      <form onSubmit={signInWithEmail} style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <label style={{ fontSize:13 }}>Email</label>
        <input
          type="email"
          placeholder="tuo@esempio.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ padding:10, fontSize:16 }}
          disabled={loading}
          required
        />
        <button type="submit" disabled={loading} style={{ padding:10 }}>
          {loading ? 'Invio...' : 'Invia link di accesso'}
        </button>
      </form>

      <div style={{ marginTop:16, textAlign:'center' }}>
        <div style={{ marginBottom:8 }}>oppure</div>
        <button onClick={signInWithGitHub} disabled={loading} style={{ padding:10 }}>
          {loading ? 'Apro GitHub...' : 'Sign in with GitHub'}
        </button>
      </div>

      {message && (
        <div style={{ marginTop:12, color: message.type === 'error' ? 'crimson' : '#333' }}>
          {message.text}
        </div>
      )}
    </div>
  );
}
