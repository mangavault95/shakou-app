// src/App.jsx
import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import useIsMobile from './hooks/useIsMobile';

import Feed from './pages/Feed';
import Profile from './pages/Profile';
import MangaSearch from './pages/MangaSearch';
import MangaDetail from './pages/MangaDetail';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Settings from './pages/Settings';

import { supabase } from './supabase';

export default function App() {
  const [view, setView] = React.useState('dashboard');
  const [user, setUser] = React.useState(null);
  const [selectedManga, setSelectedManga] = React.useState(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;
        if (mounted) setUser(session?.user ?? null);
      } catch (e) {}
    }
    init();

    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      try { subscription?.unsubscribe(); } catch (e) {}
    };
  }, []);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
    setView('explore');
  }

  return (
    <div>
      <Sidebar
        setView={setView}
        currentView={view}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <Header
        user={user}
        onLogout={handleLogout}
        setView={setView}
        onHamburger={() => setSidebarOpen(o => !o)}
      />

      <main style={{
        marginLeft: isMobile ? 0 : 220,
        padding: isMobile ? '12px 16px' : 20,
        marginTop: 64
      }}>
        {view === 'dashboard' && <Feed user={user} setView={setView} />}
        {view === 'profile' && (
          <Profile user={user} setView={setView} setSelectedManga={setSelectedManga} />
        )}
        {view === 'explore' && (
          <MangaSearch user={user} setView={setView} setSelectedManga={setSelectedManga} />
        )}
        {view === 'manga' && (
          <MangaDetail selectedManga={selectedManga} setView={setView} user={user} />
        )}
        {view === 'login' && <Login setView={setView} setUser={setUser} supabase={supabase} />}
        {view === 'admin' && (
          user?.user_metadata?.role === 'admin'
            ? <Admin />
            : <div style={{ padding: 20 }}>Accesso riservato agli amministratori.</div>
        )}
        {view === 'settings' && <Settings user={user} />}
      </main>
    </div>
  );
}
