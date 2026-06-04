// src/App.jsx
import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import MangaSearch from './pages/MangaSearch';
import MangaDetail from './pages/MangaDetail';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Settings from './pages/Settings';

export default function App() {
  const [view, setView] = React.useState('dashboard');
  const [user, setUser] = React.useState(null);
  const [selectedManga, setSelectedManga] = React.useState(null);

  function handleLogout() {
    setUser(null);
    setView('login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar setView={setView} currentView={view} />

      <div style={{ flex: 1, marginLeft: 220 }}>
        <Header user={user} onLogout={handleLogout} setView={setView} />

        <main style={{ padding: 20, marginTop: 64 }}>
          {view === 'dashboard' && <Dashboard user={user} />}
          {view === 'profile' && <Profile user={user} setView={setView} setSelectedManga={setSelectedManga} />}
          {view === 'explore' && <MangaSearch user={user} setView={setView} setSelectedManga={setSelectedManga} />}
          {view === 'manga' && <MangaDetail selectedManga={selectedManga} setView={setView} />}
          {view === 'login' && <Login setUser={setUser} setView={setView} />}
          {view === 'admin' && <Admin user={user} />}
          {view === 'settings' && <Settings user={user} />}
        </main>
      </div>
    </div>
  );
}
