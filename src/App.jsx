import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import { supabase } from './supabase';

export default function App() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setUser(data.session.user);
      }
      setLoading(false);
    });

    async function handleSessionFromUrl() {
      try {
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Profile user={user} /> : <Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}
