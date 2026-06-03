import React from 'react';
import { supabase } from './supabase';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Login from './pages/Login';
import MangaSearch from './pages/MangaSearch';
// ...
// nel menu/sidebar:
<button onClick={() => setView('explore')}>Esplora</button>
// nel main render:
{view === 'explore' && <MangaSearch />}


export default function App() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState('dashboard'); // default dashboard

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setUser(data.session.user);
      setLoading(false);
    });

    async function handleSessionFromUrl() {
      try {
        const { data } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (data?.session) setUser(data.session.user);
      } catch (e) {
        console.log('handleSessionFromUrl', e);
      }
    }
    handleSessionFromUrl();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => { if (sub?.subscription) sub.subscription.unsubscribe(); };
  }, []);

  if (loading) return <div style={{ padding:20 }}>Caricamento...</div>;
  if (!user) return <Login />;

return (
  <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
    <Header user={user} onNavigate={setView} />
    <div style={{ display:'flex', flex:1 }}>
      <Sidebar onNavigate={setView} />
      <main style={{ flex:1, background:'#fff' }}>
        {view === 'dashboard' && <Dashboard onNavigate={setView} />}
        {view === 'home' && <Profile user={user} />}
        {view === 'admin' && <Admin />}
        {view === 'settings' && (
          <div style={{ padding:20 }}>
            <h2>Impostazioni</h2>
          </div>
        )}
      </main>
    </div>
  </div>
);

}
