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
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setUser(data.session.user);
      }
      setLoading(false);
    });

    async function handleSessionFromUrl() {
      try {
        const { data } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (data?.session) setUser(data.session.user);
      } catch (e) {
        console.log(e);
      }
    }
    handleSessionFromUrl();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => { if (sub?.subscription) sub.subscription.unsubscribe(); };
  }, []);

  if (loading) return <div style={{padding:20}}>Caricamento...</div>;

  // semplice navigazione interna
  if (!user) return <Login />;

  // se sei admin e vuoi vedere admin
  if (view === 'admin') return (
    <div>
      <div style={{ padding: 12 }}>
        <button onClick={() => setView('home')} style={{ marginRight:8 }}>Torna al profilo</button>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
      <Admin />
    </div>
  );

  // view = home (profilo)
  return (
    <div>
      <div style={{ padding: 12 }}>
        <button onClick={() => setView('admin')} style={{ marginRight:8 }}>Admin Console</button>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
      <Profile user={user} />
    </div>
  );
}
