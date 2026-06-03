// api/social/follow.js
import { supabaseUpsertSingle } from '../_supabaseService.js';

export default async function handler(req, res) {
  const { follower, following, action } = req.body;
  if (!follower || !following) return res.status(400).json({ error: 'missing' });

  try {
    if (action === 'follow') {
      const row = { follower, following, created_at: new Date().toISOString() };
      const created = await supabaseUpsertSingle('follows', row, 'id');
      return res.status(200).json({ ok: true, follow: created });
    } else {
      // delete follow
      const delRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/follows?follower=eq.${follower}&following=eq.${following}`, {
        method: 'DELETE',
        headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` }
      });
      return res.status(200).json({ ok: true, deleted: delRes.status === 204 });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
