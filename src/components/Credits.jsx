// components/Credits.jsx
import React from 'react';
import { supabase } from '../supabase';

export default function Credits() {
  const [credits, setCredits] = React.useState([]);
  React.useEffect(() => {
    supabase.from('credits').select('*').then(({ data }) => setCredits(data || []));
  }, []);
  return (
    <div style={{ fontSize:12, color:'#666', padding:12 }}>
      {credits.map(c => (
        <div key={c.id}>
          {c.credit_text} <a href={c.link} target="_blank" rel="noreferrer">Dettagli</a>
        </div>
      ))}
    </div>
  );
}
