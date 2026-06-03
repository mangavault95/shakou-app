// api/sync/mangadex.js
import { supabaseUpsertSingle } from './_supabaseService.js';

const MANG ADEX_BASE = process.env.MANG ADEX_BASE_URL || 'https://api.mangadex.org';
const SYNC_SECRET = process.env.SYNC_SECRET;

export default async function handler(req, res) {
  const token = req.headers['x-sync-token'];
  if (!token || token !== SYNC_SECRET) return res.status(401).json({ error: 'unauthorized' });

  try {
    // Example: get list of manga ids from our DB that need chapter sync
    // For simplicity, fetch recent manga with source 'mangadex' or external mapping
    // Here we assume manga.external_id contains MangaDex id when source='mangadex'
    // If you use AniList->MangaDex mapping, implement mapping table.
    const supRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manga?select=id,external_id,source&source=eq.mangadex`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    const mangas = await supRes.json();

    for (const m of mangas) {
      const mdId = m.external_id;
      if (!mdId) continue;
      // fetch chapters for manga
      const chRes = await fetch(`${MANG ADEX_BASE}/chapter?manga[]=${mdId}&limit=100&translatedLanguage[]=en`);
      const chJson = await chRes.json();
      const chapters = chJson.data || [];
      for (const c of chapters) {
        const attr = c.attributes || {};
        const chapterRow = {
          manga_id: m.id,
          external_id: c.id,
          source: 'mangadex',
          chapter_number: attr.chapter ? Number(attr.chapter) : null,
          title: attr.title || null,
          pages: JSON.stringify({ hash: attr.hash, data: attr.data || [] }),
          published_at: attr.publishAt || null,
          created_at: new Date().toISOString()
        };
        await supabaseUpsertSingle('chapters', chapterRow, 'external_id,source');
      }
    }

    return res.status(200).json({ ok: true, mangas: mangas.length });
  } catch (err) {
    console.error('syncMangaDex error', err);
    return res.status(500).json({ error: String(err) });
  }
}
