// api/social/library.js
// Libreria manga dell'utente (consolida follow/unfollow/list).
//   GET                              -> lista la libreria dell'utente autenticato
//   POST { action:'follow', manga }  -> aggiunge un manga alla libreria
//   POST { action:'unfollow', manga_id?, external_id? } -> rimuove un manga
import { admin, getUserFromRequest, parseBody } from '../_auth.js';

export default async function handler(req, res) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await admin
        .from('user_manga')
        .select('*, manga(*)')
        .eq('user_id', user.id);
      if (error) throw error;
      return res.status(200).json({ ok: true, library: data || [] });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);

      if (body.action === 'follow') {
        const manga = body.manga || {};
        if (!manga.external_id) return res.status(400).json({ error: 'missing manga.external_id' });

        const mangaRow = {
          external_id: String(manga.external_id),
          source: manga.source || 'anilist',
          title: manga.title || null,
          cover_url: manga.cover_url || null,
          last_synced: new Date().toISOString()
        };
        const { data: upserted, error: mErr } = await admin
          .from('manga')
          .upsert([mangaRow], { onConflict: 'external_id,source' })
          .select()
          .single();
        if (mErr) throw mErr;

        const userMangaRow = {
          user_id: user.id,
          manga_id: upserted.id,
          external_id: manga.external_id,
          source: manga.source || 'anilist',
          status: 'plan',
          volumes_owned: 0,
          volumes_read: 0,
          bookmark: null,
          updated_at: new Date().toISOString()
        };
        const { data: um, error: umErr } = await admin
          .from('user_manga')
          .upsert([userMangaRow], { onConflict: 'user_id,manga_id' })
          .select()
          .single();
        if (umErr) throw umErr;

        return res.status(200).json({ ok: true, manga: upserted, user_manga: um });
      }

      if (body.action === 'unfollow') {
        const manga_id = body.manga_id || null;
        const external_id = body.external_id || null;
        if (!manga_id && !external_id) return res.status(400).json({ error: 'missing manga_id/external_id' });

        let q = admin.from('user_manga').delete().eq('user_id', user.id);
        q = manga_id ? q.eq('manga_id', manga_id) : q.eq('external_id', external_id);
        const { error } = await q;
        if (error) throw error;
        return res.status(200).json({ ok: true, deleted: true });
      }

      return res.status(400).json({ error: 'invalid_action' });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('library error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
