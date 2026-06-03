// api/social/like.js
import { supabaseUpsertSingle } from '../_supabaseService.js';

export default async function handler(req, res) {
  const { user_id, post_id, comment_id, action } = req.body; // action: 'like'|'unlike'
  if (!user_id) return res.status(400).json({ error: 'missing user' });

  try {
    if (action === 'like') {
      const row = { user_id, post_id: post_id || null, comment_id: comment_id || null, created_at: new Date().toISOString() };
      const created = await supabaseUpsertSingle('likes', row, 'id');
      return res.status(200).json({ ok: true, like: created });
    } else {
      // delete like (service role or client with RLS)
      const query = new URLSearchParams();
      if (post_id) query.append('post_id', `eq.${post_id}`);
      if (comment_id) query.append('comment_id', `eq.${comment_id}`);
      query.append('user_id', `eq.${user_id}`);
      const delRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/likes?${query.toString()}`, {
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
