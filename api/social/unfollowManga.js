// api/social/unfollowManga.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars for unfollowManga');
  throw new Error('Missing Supabase env vars');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const body = req.body || (await new Promise(r => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => r(JSON.parse(data || '{}')));
    }));

    const { user_id, manga_id, external_id } = body;
    if (!user_id || (!manga_id && !external_id)) {
      return res.status(400).json({ error: 'missing user_id or manga_id/external_id' });
    }

    // Costruisci filtro: preferisci manga_id se fornito, altrimenti external_id
    let filter;
    if (manga_id) {
      filter = `user_id=eq.${encodeURIComponent(user_id)}&manga_id=eq.${encodeURIComponent(manga_id)}`;
    } else {
      filter = `user_id=eq.${encodeURIComponent(user_id)}&external_id=eq.${encodeURIComponent(external_id)}`;
    }

    const url = `${SUPABASE_URL}/rest/v1/user_manga?${filter}`;
    const r = await fetch(url, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = text; }

    if (!r.ok) {
      console.error('unfollowManga supabase error', r.status, data);
      return res.status(500).json({ error: 'supabase_delete_failed', detail: data });
    }

    // Supabase REST DELETE returns an empty body on success; conferma con 200
    return res.status(200).json({ ok: true, deleted: true });
  } catch (err) {
    console.error('unfollowManga error', err && (err.stack || err.message || err));
    return res.status(500).json({ error: 'internal_server_error', detail: String(err && (err.message || err)) });
  }
}
