// api/sync.js
// Sincronizzazione manga dai sorgenti esterni verso Supabase.
// Uso:  /api/sync?source=anilist   |   /api/sync?source=mangadex
// Protetto dall'header x-sync-token == SYNC_SECRET.
import { supabaseUpsertSingle } from './_supabaseService.js';
import { translateText } from './_translate.js';

const ANILIST_URL = process.env.ANILIST_GRAPHQL_URL || 'https://graphql.anilist.co';
const MANGADEX_BASE = process.env.MANGADEX_BASE_URL || 'https://api.mangadex.org';
const SYNC_SECRET = process.env.SYNC_SECRET;
const TARGET_LANG = process.env.SYNC_TARGET_LANG || 'it';

function normalizeAniListTitle(titleObj) {
  return {
    romaji: titleObj?.romaji || null,
    english: titleObj?.english || null,
    native: titleObj?.native || null
  };
}

async function syncAniList() {
  const query = `
    query ($page:Int, $perPage:Int) {
      Page(page:$page, perPage:$perPage) {
        media(type: MANGA) {
          id
          title { romaji english native }
          synonyms
          description(asHtml:false)
          genres
          status
          popularity
          isAdult
          startDate { year month day }
          coverImage { large medium }
          staff { edges { node { id name { full } } } }
        }
      }
    }
  `;
  const variables = { page: 1, perPage: 25 };
  const r = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  const json = await r.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));

  const media = json.data.Page.media || [];
  let count = 0;
  for (const m of media) {
    if (m.isAdult) continue; // skip adult content

    const authors = (m.staff?.edges || []).map(e => ({ id: e.node.id, name: e.node.name?.full }));
    const synopsis = m.description || null;

    let translatedSynopsis = null;
    if (synopsis) {
      try { translatedSynopsis = await translateText(synopsis, TARGET_LANG); } catch (e) { translatedSynopsis = null; }
    }

    const row = {
      external_id: String(m.id),
      source: 'anilist',
      title: normalizeAniListTitle(m.title),
      alt_titles: JSON.stringify(m.synonyms || []),
      authors: JSON.stringify(authors),
      genres: m.genres || [],
      synopsis,
      synopsis_translated: translatedSynopsis,
      cover_url: m.coverImage?.large || m.coverImage?.medium || null,
      status: m.status || null,
      popularity_score: m.popularity || null,
      last_synced: new Date().toISOString()
    };
    await supabaseUpsertSingle('manga', row, 'external_id,source');
    count++;
  }
  return { count };
}

async function syncMangaDex() {
  // manga gia' presenti su Supabase con source mangadex
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

    const mdMetaRes = await fetch(`${MANGADEX_BASE}/manga/${mdId}`);
    const mdMetaJson = await mdMetaRes.json();
    const mdAttr = mdMetaJson.data?.attributes || {};
    const contentRating = (mdAttr.contentRating || '').toLowerCase();
    if (contentRating === 'erotica' || contentRating === 'pornographic') continue;

    const titleObj = mdAttr.title || {};
    const synopsis = mdAttr.description?.en || mdAttr.description?.it || null;

    let translatedSynopsis = null;
    if (synopsis) {
      try { translatedSynopsis = await translateText(synopsis, TARGET_LANG); } catch (e) { translatedSynopsis = null; }
    }

    let coverUrl = null;
    const coverRel = (mdMetaJson.data?.relationships || []).find(r => r.type === 'cover_art');
    if (coverRel && coverRel.id) {
      coverUrl = `${process.env.MANGADEX_CDN || 'https://uploads.mangadex.org'}/covers/${mdId}/${coverRel.attributes?.fileName || ''}`;
    }

    const row = {
      external_id: String(mdId),
      source: 'mangadex',
      title: { romaji: titleObj.en || null, english: titleObj.en || null, native: titleObj.jp || null },
      alt_titles: JSON.stringify([]),
      authors: JSON.stringify([]),
      genres: mdAttr.tags ? mdAttr.tags.map(t => t.name?.en || t.name?.it || t.name?.ja).filter(Boolean) : [],
      synopsis,
      synopsis_translated: translatedSynopsis,
      cover_url: coverUrl,
      status: mdAttr.status || null,
      popularity_score: null,
      last_synced: new Date().toISOString()
    };
    await supabaseUpsertSingle('manga', row, 'external_id,source');

    // capitoli (translatedLanguage en)
    const chRes = await fetch(`${MANGADEX_BASE}/chapter?manga[]=${mdId}&limit=100&translatedLanguage[]=en`);
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
  return { mangas: mangas.length };
}

export default async function handler(req, res) {
  const token = req.headers['x-sync-token'];
  if (!token || token !== SYNC_SECRET) return res.status(401).json({ error: 'unauthorized' });

  const source = (req.query.source || '').toString().toLowerCase();
  try {
    if (source === 'anilist') {
      const result = await syncAniList();
      return res.status(200).json({ ok: true, source, ...result });
    }
    if (source === 'mangadex') {
      const result = await syncMangaDex();
      return res.status(200).json({ ok: true, source, ...result });
    }
    return res.status(400).json({ error: 'missing or invalid source (anilist|mangadex)' });
  } catch (err) {
    console.error('sync error', err);
    return res.status(500).json({ error: String(err) });
  }
}
