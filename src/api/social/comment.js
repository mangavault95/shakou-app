// api/social/comment.js
import { supabaseUpsertSingle } from '../_supabaseService.js';

export default async function handler(req, res) {
  const { user_id, post_id, content } = req.body;
  if (!user_id || !post_id || !content) return res.status(400).json({ error: 'missing' });

  try {
    const row = { post_id, user_id, content, created_at: new Date().toISOString() };
    const created = await supabaseUpsertSingle('comments', row, 'id');

    // create notification for post owner via service role (fetch post owner then insert notification)
    // omitted here for brevity; implement using supabase service helper

    return res.status(200).json({ ok: true, comment: created });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
