import React from 'react';
import { supabase } from '../supabase';

export default function Credits() {
  const [credits, setCredits] = React.useState([]);
  React.useEffect(() => {
    let mounted = true;
    supabase.from('credits').select('*').then(({ data }) => {
      if (mounted) setCredits(data || []);
    });
    return () => { mounted = false; };
  }, []);
  return (
    <div style={{ fontSize:13, color:'#666' }}>
      {credits.map(c => (
        <div key={c.id} style={{ marginBottom:6 }}>
          {c.credit_text} <a href={c.link} target="_blank" rel="noreferrer">Dettagli</a>
        </div>
      ))}
      {credits.length === 0 && (
        <div>Dati forniti da AniList e MangaDex. Vedi i credits nella sezione Admin.</div>
      )}
    </div>
  );
}
