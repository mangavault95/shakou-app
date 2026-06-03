// api/social/getUserLibrary.js
import { supabaseFetch } from '../_supabaseService.js'; // se hai helper; altrimenti usa fetch con SUPABASE_URL

export default async function handler(req, res) {
  try {
    const user_id = req.query.user_id || (req.method === 'POST' && req.body?.user_id);
    if (!user_id) return res.status(400).json({ error: 'missing user_id' });

    // Query diretta a Supabase REST (usa SUPABASE_SERVICE_ROLE_KEY nel server)
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = `${SUPABASE_URL}/rest/v1/user_manga?user_id=eq.${encodeURIComponent(user_id)}&select=*,manga(*)`;
    const r = await fetch(url, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`
      }
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = text; }
    if (!r.ok) return res.status(500).json({ error: 'supabase_error', detail: data });

    return res.status(200).json({ ok: true, library: data });
  } catch (err) {
    console.error('getUserLibrary error', err);
    return res.status(500).json({ error: 'internal_server_error', detail: String(err) });
  }
}
