import React from 'react';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import { supabase } from './supabase';

export default function App() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState('home'); // 'home' | 'admin' | 'login'

  React.useEffect(() => {
    // 1) check existing session
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setUser(data.session.user);
      setLoading(false);
    });

    // 2) handle redirect tokens in URL (oauth / magic link)
    async function handleSessionFromUrl() {
      try {
        const { data } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (data?.session) setUser(data.session.user);
      } catch (e) {
        console.log('handleSessionFromUrl', e);
      }
    }
    handleSessionFromUrl();

    // 3) listen to auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => { if (sub?.subscription) sub.subscription.unsubscribe(); };
  }, []);

  if (loading) return <div style={{padding:20}}>Caricamento...</div>;

  if (!user) return <Login />;

  // semplice navigazione interna
  return (
    <div>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:12, borderBottom:'1px solid #eee' }}>
        <div style={{ fontWeight:700 }}>Shakou</div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setView('home')} style={{ padding:8 }}>Profilo</button>
          <button onClick={() => setView('admin')} style={{ padding:8 }}>Admin</button>
          <button onClick={() => supabase.auth.signOut()} style={{ padding:8 }}>Sign out</button>
        </div>
      </header>

      <main>
        {view === 'home' && <Profile user={user} />}
        {view === 'admin' && <Admin />}
      </main>
    </div>
  );
}
