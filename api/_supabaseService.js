// api/_supabaseService.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  // throw to fail fast in deploy/runtime so you vedi l'errore nel log
  throw new Error('Missing Supabase env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export async function supabaseUpsertSingle(table, row, conflictKey = 'external_id') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflictKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify([row])
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = text; }
  if (!res.ok) throw new Error(`Supabase upsertSingle ${table} failed: ${res.status} ${JSON.stringify(data)}`);
  return Array.isArray(data) ? data[0] : data;
}
