// api/social/updateProgress.js
import { supabaseUpsertSingle } from '../_supabaseService.js';

const SYNC_SECRET = process.env.SYNC_SECRET;

export default async function handler(req, res) {
  const token = req.headers['x-sync-token'];
  if (!token || token !== SYNC_SECRET) return res.status(401).json({ error: 'unauthorized' });

  try {
    const { user_id, manga_id, updates } = req.body; // updates: { status, volumes_owned, volumes_read, bookmark }
    if (!user_id || !manga_id || !updates) return res.status(400).json({ error: 'missing' });

    const row = {
      user_id,
      manga_id,
      ...updates,
      updated_at: new Date().toISOString()
    };
    const updated = await supabaseUpsertSingle('user_manga', row, 'user_id,manga_id');
    return res.status(200).json({ ok: true, user_manga: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
