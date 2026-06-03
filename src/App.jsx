// src/App.jsx
import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import MangaDetail from './pages/MangaDetail';

export default function App() {
  const [view, setView] = React.useState('dashboard'); // default
  const [user, setUser] = React.useState(null); // imposta con la sessione reale
  const [selectedManga, setSelectedManga] = React.useState(null);

  function handleLogout() {
    // implementa logout supabase o redirect
    setUser(null);
    setView('explore');
  }

  function openSearch() {
    setView('explore');
  }

  return (
    <div>
      <Sidebar setView={setView} currentView={view} />
      <Header user={user} onLogout={handleLogout} onOpenSearch={openSearch} />

      <main style={{ marginLeft: 220, padding: 20, marginTop: 64 }}>
        {view === 'dashboard' && <Dashboard user={user} />}
        {view === 'profile' && <Profile user={user} setView={setView} setSelectedManga={setSelectedManga} />}
        {view === 'explore' && <Explore user={user} onOpen={(m) => { setSelectedManga(m); setView('manga'); }} />}
        {view === 'manga' && <MangaDetail selectedManga={selectedManga} setView={setView} />}
        {view === 'admin' && <div>Admin (in costruzione)</div>}
        {view === 'settings' && <div>Impostazioni (in costruzione)</div>}
      </main>
    </div>
  );
}
