// api/sync/mangadex.js
import { supabaseUpsertSingle } from './_supabaseService.js';
import { translateText } from '../utils/translate.js';

const MANG ADEX_BASE = process.env.MANG ADEX_BASE_URL || 'https://api.mangadex.org'; // se il tuo env usa nome diverso, correggi
const SYNC_SECRET = process.env.SYNC_SECRET;
const TARGET_LANG = process.env.SYNC_TARGET_LANG || 'it';

export default async function handler(req, res) {
  const token = req.headers['x-sync-token'];
  if (!token || token !== SYNC_SECRET) return res.status(401).json({ error: 'unauthorized' });

  try {
    // fetch manga list from supabase (manga with source mangadex)
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

      // fetch manga details
      const mdMetaRes = await fetch(`${MANG ADEX_BASE}/manga/${mdId}`);
      const mdMetaJson = await mdMetaRes.json();
      const mdAttr = mdMetaJson.data?.attributes || {};
      const contentRating = (mdAttr.contentRating || '').toLowerCase();

      // skip erotica/pornographic
      if (contentRating === 'erotica' || contentRating === 'pornographic') continue;

      const titleObj = mdAttr.title || {};
      const synopsis = mdAttr.description?.en || mdAttr.description?.it || null;

      // translate synopsis if needed
      let translatedSynopsis = null;
      if (synopsis) {
        try { translatedSynopsis = await translateText(synopsis, TARGET_LANG); } catch (e) { translatedSynopsis = null; }
      }

      // cover: MangaDex uses relationships to get cover art; fetch cover if present
      let coverUrl = null;
      const coverRel = (mdMetaJson.data?.relationships || []).find(r => r.type === 'cover_art');
      if (coverRel && coverRel.id) {
        // get cover image
        coverUrl = `${process.env.MANG ADEX_CDN || 'https://uploads.mangadex.org'}/covers/${mdId}/${coverRel.attributes?.fileName || ''}`;
      }

      const row = {
        external_id: String(mdId),
        source: 'mangadex',
        title: { romaji: titleObj.en || null, english: titleObj.en || null, native: titleObj.jp || null },
        alt_titles: JSON.stringify([]),
        authors: JSON.stringify([]),
        genres: mdAttr.tags ? mdAttr.tags.map(t => t.name?.en || t.name?.it || t.name?.ja).filter(Boolean) : [],
        synopsis: synopsis,
        synopsis_translated: translatedSynopsis,
        cover_url: coverUrl,
        status: mdAttr.status || null,
        popularity_score: null,
        last_synced: new Date().toISOString()
      };

      await supabaseUpsertSingle('manga', row, 'external_id,source');

      // chapters sync (existing logic, but ensure translatedLanguage filter)
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
