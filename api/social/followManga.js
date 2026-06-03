// api/social/followManga.js
import { supabaseUpsertSingle } from '../_supabaseService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  try {
    const body = req.body || (await new Promise(r => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => r(JSON.parse(data || '{}')));
    }));

    const { user_id, manga } = body;
    if (!user_id || !manga?.external_id) return res.status(400).json({ error: 'missing user_id or manga.external_id' });

    // upsert manga in public.manga
    const mangaRow = {
      external_id: String(manga.external_id),
      source: manga.source || 'anilist',
      title: JSON.stringify({ romaji: manga.title || null }),
      cover_url: manga.cover_url || null,
      last_synced: new Date().toISOString()
    };

    const upserted = await supabaseUpsertSingle('manga', mangaRow, 'external_id,source');

    // upsert user_manga
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
    console.error('followManga error:', err && (err.stack || err.message || err));
    // restituisci sempre JSON leggibile dal client
    return res.status(500).json({ error: 'internal_server_error', detail: String(err && (err.message || err)) });
  }
}
