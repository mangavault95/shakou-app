import React from 'react';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { supabase } from './supabase';

export default function App() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // 1) check existing session
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setUser(data.session.user);
        upsertProfile(data.session.user);
      }
      setLoading(false);
    });

    // 2) handle magic link / oauth redirect tokens in URL
    async function handleSessionFromUrl() {
      try {
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) {
          console.log('getSessionFromUrl', error.message);
          return;
        }
        if (data?.session) {
          setUser(data.session.user);
          upsertProfile(data.session.user);
        }
      } catch (e) {
        console.log('handleSessionFromUrl error', e);
      }
    }
    handleSessionFromUrl();

    // 3) listen to auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) upsertProfile(u);
    });

    return () => {
      if (sub?.subscription) sub.subscription.unsubscribe();
    };
  }, []);

  // upsert profile into Supabase table 'profiles'
  async function upsertProfile(user) {
    if (!user?.id) return;
    try {
      const profile = {
        id: user.id,
        email: user.email ?? null,
        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
      };
      const { error } = await supabase.from('profiles').upsert(profile, { returning: 'minimal' });
      if (error) console.log('upsertProfile error', error.message);
    } catch (e) {
      console.log('upsertProfile exception', e);
    }
  }

  if (loading) return <div style={{padding:20}}>Caricamento...</div>;
  return user ? <Profile user={user} /> : <Login />;
}
