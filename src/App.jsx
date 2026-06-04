// src/App.jsx
import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import MangaSearch from './pages/MangaSearch';
import MangaDetail from './pages/MangaDetail';

export default function App() {
  const [view, setView] = React.useState('dashboard');
  const [user, setUser] = React.useState(null); 
  const [selectedManga, setSelectedManga] = React.useState(null);

  function handleLogout() {
    setUser(null);
    setView('explore');
  }

  function openSearch() {
    setView('explore');
  }

  return (
    <div>
     // snippet da usare in src/App.jsx
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
        {view === 'admin' && <div>Admin (in costruzione)</div>}
        {view === 'settings' && <div>Impostazioni (in costruzione)</div>}
      </main>
    </div>
  );
}
