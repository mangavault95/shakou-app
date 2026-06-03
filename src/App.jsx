import React from 'react';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { supabase } from './supabase';

export default function App() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    // ottieni sessione corrente (se l'utente è già loggato)
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setUser(data.session.user);
    });

    // ascolta cambi di auth (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return user ? <Profile user={user} /> : <Login />;
}
