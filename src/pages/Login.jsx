// src/pages/Login.jsx
import React from 'react';
import { supabase } from '../supabase';

export default function Login({ setUser, setView }) {
  const [mode, setMode] = React.useState('login'); // 'login' | 'register'
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    async function checkSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data?.session?.user) {
          setUser?.(data.session.user);
          setView?.('profile');
        }
      } catch {}
    }
    checkSession();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser?.(session.user);
        setView?.('profile');
      }
    });

    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, [setUser, setView]);

  function switchMode(m) {
    setMode(m);
    setMessage(null);
    setPassword('');
    setConfirm('');
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    setMessage(null);

    if (!email || !password) {
      setMessage({ type: 'error', text: 'Compila tutti i campi.' });
      return;
    }

    if (mode === 'register') {
      if (password.length < 8) {
        setMessage({ type: 'error', text: 'Password minimo 8 caratteri.' });
        return;
      }
      if (password !== confirm) {
        setMessage({ type: 'error', text: 'Le password non coincidono.' });
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setMessage({ type: 'error', text: error.message });
        } else {
          setMessage({
            type: 'success',
            text: 'Registrazione completata! Controlla la tua email e clicca il link di verifica per attivare l\'account.'
          });
          setPassword('');
          setConfirm('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            setMessage({ type: 'error', text: 'Email non ancora verificata. Controlla la tua casella di posta.' });
          } else if (error.message?.toLowerCase().includes('invalid login credentials')) {
            setMessage({ type: 'error', text: 'Email o password errati.' });
          } else {
            setMessage({ type: 'error', text: error.message });
          }
        }
        // se ok, onAuthStateChange gestisce il redirect
      }
    } catch {
      setMessage({ type: 'error', text: 'Errore di rete. Riprova.' });
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGitHub() {
    setLoading(true);
    setMessage(null);
    try {
      const redirectTo = import.meta.env.VITE_APP_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo }
      });
      if (error) setMessage({ type: 'error', text: error.message || 'Errore OAuth' });
    } catch {
      setMessage({ type: 'error', text: 'Errore OAuth. Riprova.' });
    } finally {
      setLoading(false);
    }
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
    fontWeight: active ? 700 : 400,
    borderBottom: active ? '2px solid #f44336' : '2px solid transparent',
    background: 'none', fontSize: 15, color: active ? '#f44336' : '#555'
  });

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 24, border: '1px solid #ddd', borderRadius: 10, background: '#fff' }}>
      <h2 style={{ marginTop: 0, marginBottom: 20 }}>Shakou</h2>

      {/* Tab login / registrazione */}
      <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: 20 }}>
        <button style={tabStyle(mode === 'login')} onClick={() => switchMode('login')}>Accedi</button>
        <button style={tabStyle(mode === 'register')} onClick={() => switchMode('register')}>Registrati</button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 13, color: '#555' }}>Email</label>
          <input
            type="email"
            placeholder="tuo@esempio.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ padding: 10, fontSize: 15, border: '1px solid #ddd', borderRadius: 6 }}
            disabled={loading}
            required
            autoComplete="email"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 13, color: '#555' }}>Password</label>
          <input
            type="password"
            placeholder={mode === 'register' ? 'Minimo 8 caratteri' : '••••••••'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ padding: 10, fontSize: 15, border: '1px solid #ddd', borderRadius: 6 }}
            disabled={loading}
            required
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
        </div>

        {mode === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 13, color: '#555' }}>Conferma password</label>
            <input
              type="password"
              placeholder="Ripeti la password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={{ padding: 10, fontSize: 15, border: '1px solid #ddd', borderRadius: 6 }}
              disabled={loading}
              required
              autoComplete="new-password"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 4, padding: '12px 0', background: '#f44336', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 700, cursor: 'pointer'
          }}
        >
          {loading ? '…' : mode === 'register' ? 'Crea account' : 'Accedi'}
        </button>
      </form>

      <div style={{ marginTop: 16, textAlign: 'center', color: '#999', fontSize: 13 }}>oppure</div>

      <button
        onClick={signInWithGitHub}
        disabled={loading}
        style={{
          marginTop: 12, width: '100%', padding: '10px 0',
          border: '1px solid #ddd', borderRadius: 6, background: '#fff',
          cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8
        }}
      >
        <svg height="20" viewBox="0 0 16 16" width="20" style={{ fill: '#222' }}>
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        Continua con GitHub
      </button>

      {message && (
        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 6, fontSize: 14,
          background: message.type === 'error' ? '#fff0f0' : message.type === 'success' ? '#f0fff4' : '#f0f4ff',
          color: message.type === 'error' ? '#c0392b' : message.type === 'success' ? '#27ae60' : '#333',
          border: `1px solid ${message.type === 'error' ? '#fcc' : message.type === 'success' ? '#a3e4b5' : '#d0d8ff'}`
        }}>
          {message.text}
        </div>
      )}
    </div>
  );
}
