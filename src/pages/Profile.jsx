import React from 'react';
import { supabase } from '../supabase';

export default function Profile({ user }) {
  const [series, setSeries] = React.useState([]);

  React.useEffect(() => {
    async function load() {
      const { data } = await supabase.from('series').select('*').eq('created_by', user.id);
      setSeries(data || []);
    }
    load();
  }, [user]);

  return (
    <div style={{padding:20}}>
      <h2>Profilo</h2>
      <p><strong>{user.email}</strong></p>
      <h3>Le tue serie</h3>
      <ul>{series.map(s => <li key={s.id}>{s.title} ({s.type})</li>)}</ul>
    </div>
  );
}
