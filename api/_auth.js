// api/_auth.js
// Helper condivisi per le API social: client service-role + verifica token utente.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Client admin (service role): bypassa le RLS, usato per query e scritture.
export const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Verifica il token Bearer e ritorna lo user autenticato, oppure null.
export async function getUserFromRequest(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch (e) {
    return null;
  }
}

// Allega l'autore (profilo) a una lista di righe, senza dipendere da una FK
// PostgREST: fa una query separata su profiles e unisce in JS.
export async function attachAuthors(rows, key = 'user_id') {
  const list = rows || [];
  const ids = [...new Set(list.map(r => r[key]).filter(Boolean))];
  if (!ids.length) return list;
  const { data: profs } = await admin.from('profiles').select('id, full_name, email').in('id', ids);
  const map = {};
  (profs || []).forEach(p => { map[p.id] = p; });
  return list.map(r => ({ ...r, author: map[r[key]] || null }));
}

// Parsing sicuro del body (alcuni host lo passano come stringa).
export function parseBody(req) {
  let payload = req.body || {};
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) { payload = {}; }
  }
  return payload || {};
}
