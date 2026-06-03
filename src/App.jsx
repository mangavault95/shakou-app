import React from 'react';
import { supabase } from './supabase';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Login from './pages/Login';
import MangaSearch from './pages/MangaSearch';
import MangaDetail from './pages/MangaDetail';

export default function App() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState('dashboard');
  const [selectedManga, setSelectedManga] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        // data.session may be undefined; handle both shapes
        const session = data?.session ?? data?.session ?? null;
        if (mounted) {
          setUser(session?.user ?? null);
          console.log('App init session user:', session?.user ?? null);
          setLoading(false);
        }
      } catch (e) {
        console.error('getSession error', e);
        if (mounted) setLoading(false);
      }
    }
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // session may be null when signed out
      const u = session?.user ?? null;
      setUser(u);
      console.log('onAuthStateChange user:', u);
    });

    return () => {
      mounted = false;
      try { sub?.subscription?.unsubscribe?.(); } catch (e) { /* ignore */ }
    };
  }, []);

  if (loading) return <div style={{ padding:20 }}>Caricamento...</div>;
  if (!user) return <Login />;

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <Header user={user} />
      <div style={{ display:'flex', flex:1 }}>
        <Sidebar onNavigate={setView} />
        <main style={{ flex:1, background:'#fff' }}>
          {view === 'dashboard' && <Dashboard onNavigate={setView} />}
          {view === 'home' && <Profile user={user} />}
          {view === 'explore' && <MangaSearch user={user} setView={setView} setSelectedManga={setSelectedManga} />}
          {view === 'manga' && selectedManga && <MangaDetail user={user} externalId={selectedManga.externalId} source={selectedManga.source} />}
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
