// api/social/mangaComments.js
import { supabaseUpsertSingle, supabaseFetch } from '../_supabaseService.js';

const SYNC_SECRET = process.env.SYNC_SECRET;

export default async function handler(req, res) {
  const token = req.headers['x-sync-token'];
  if (!token || token !== SYNC_SECRET) return res.status(401).json({ error: 'unauthorized' });

  try {
    if (req.method === 'POST') {
      const { user_id, manga_id, content } = req.body;
      if (!user_id || !manga_id || !content) return res.status(400).json({ error: 'missing' });
      const row = { manga_id, user_id, content, created_at: new Date().toISOString() };
      const created = await supabaseUpsertSingle('manga_comments', row, 'id');
      return res.status(200).json({ ok: true, comment: created });
    } else {
      const { manga_id } = req.query;
      if (!manga_id) return res.status(400).json({ error: 'missing manga_id' });
      const comments = await supabaseFetch('manga_comments', `manga_id=eq.${manga_id}&order=created_at.desc`);
      return res.status(200).json({ ok: true, comments });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
