// src/App.jsx
import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import MangaSearch from './pages/MangaSearch';
import MangaDetail from './pages/MangaDetail';
import Login from './pages/Login';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

export default function App() {
  const [view, setView] = React.useState('dashboard');
  const [user, setUser] = React.useState(null);
  const [selectedManga, setSelectedManga] = React.useState(null);

  // Sync user with Supabase session and auth events
  React.useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;
        if (mounted) setUser(session?.user ?? null);
      } catch (e) {
        // ignore
      }
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
    } catch (e) {
      // ignore
    }
    setUser(null);
    setView('explore');
  }

  return (
    <div>
      <Sidebar setView={setView} currentView={view} />
      <Header user={user} onLogout={handleLogout} setView={setView} />

      <main style={{ marginLeft: 220, padding: 20, marginTop: 64 }}>
        {view === 'dashboard' && <Dashboard user={user} />}
        {view === 'profile' && (
          <Profile
            user={user}
            setView={setView}
            setSelectedManga={setSelectedManga}
          />
        )}
        {view === 'explore' && (
          <MangaSearch
            user={user}
            setView={setView}
            setSelectedManga={setSelectedManga}
          />
        )}
        {view === 'manga' && (
          <MangaDetail
            selectedManga={selectedManga}
            setView={setView}
          />
        )}
        {view === 'login' && <Login setView={setView} setUser={setUser} supabase={supabase} />}
        {view === 'admin' && <div>Admin (in costruzione)</div>}
        {view === 'settings' && <div>Impostazioni (in costruzione)</div>}
      </main>
    </div>
  );
}
