// api/sync/anilist.js
import { supabaseUpsertSingle } from './_supabaseService.js';
import { translateText } from '../utils/translate.js';

const ANILIST_URL = process.env.ANILIST_GRAPHQL_URL || 'https://graphql.anilist.co';
const SYNC_SECRET = process.env.SYNC_SECRET;
const TARGET_LANG = process.env.SYNC_TARGET_LANG || 'it'; // lingua di destinazione per le traduzioni

function normalizeTitle(titleObj) {
  return {
    romaji: titleObj?.romaji || null,
    english: titleObj?.english || null,
    native: titleObj?.native || null
  };
}

export default async function handler(req, res) {
  const token = req.headers['x-sync-token'];
  if (!token || token !== SYNC_SECRET) return res.status(401).json({ error: 'unauthorized' });

  try {
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
      // skip adult content
      if (m.isAdult) continue;

      const authors = (m.staff?.edges || []).map(e => ({ id: e.node.id, name: e.node.name?.full }));
      const synopsis = m.description || null;

      // optional: translate synopsis/title if not in target language
      let translatedSynopsis = null;
      if (synopsis) {
        try {
          translatedSynopsis = await translateText(synopsis, TARGET_LANG);
        } catch (e) {
          translatedSynopsis = null;
        }
      }

      const row = {
        external_id: String(m.id),
        source: 'anilist',
        title: normalizeTitle(m.title),
        alt_titles: JSON.stringify(m.synonyms || []),
        authors: JSON.stringify(authors),
        genres: m.genres || [],
        synopsis: synopsis,
        synopsis_translated: translatedSynopsis,
        cover_url: m.coverImage?.large || m.coverImage?.medium || null,
        status: m.status || null,
        popularity_score: m.popularity || null,
        last_synced: new Date().toISOString()
      };
      await supabaseUpsertSingle('manga', row, 'external_id,source');
      count++;
    }

    return res.status(200).json({ ok: true, count });
  } catch (err) {
    console.error('syncAnilist error', err);
    return res.status(500).json({ error: String(err) });
  }
}
