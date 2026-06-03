// api/social/followManga.js
import { supabaseUpsertSingle } from '../_supabaseService.js';

const SYNC_SECRET = process.env.SYNC_SECRET;

export default async function handler(req, res) {
  const token = req.headers['x-sync-token'];
  if (!token || token !== SYNC_SECRET) return res.status(401).json({ error: 'unauthorized' });

  try {
    const { user_id, manga } = req.body; // manga: { external_id, source, title, cover_url }
    if (!user_id || !manga?.external_id) return res.status(400).json({ error: 'missing' });

    // 1) ensure manga exists in public.manga (upsert by external_id+source)
    const mangaRow = {
      external_id: String(manga.external_id),
      source: manga.source || 'anilist',
      title: JSON.stringify({ romaji: manga.title || null }),
      cover_url: manga.cover_url || null,
      last_synced: new Date().toISOString()
    };
    const upserted = await supabaseUpsertSingle('manga', mangaRow, 'external_id,source');

    // 2) upsert user_manga
    const userMangaRow = {
      user_id,
      manga_id: upserted.id,
      external_id: manga.external_id,
      source: manga.source || 'anilist',
      status: 'plan',
      volumes_owned: 0,
      volumes_read: 0,
      bookmark: null,
      updated_at: new Date().toISOString()
    };
    const userManga = await supabaseUpsertSingle('user_manga', userMangaRow, 'user_id,manga_id');

    return res.status(200).json({ ok: true, manga: upserted, user_manga: userManga });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
