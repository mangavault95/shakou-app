// api/_supabaseService.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars');
}

export async function supabaseUpsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'resolution=merge-duplicates' // upsert behavior
    },
    body: JSON.stringify(rows)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase upsert ${table} failed: ${res.status} ${text}`);
  return text;
}

export async function supabaseUpsertSingle(table, row, conflictKey = 'external_id') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflictKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify([row])
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Supabase upsertSingle ${table} failed: ${res.status} ${JSON.stringify(data)}`);
  return data[0];
}
