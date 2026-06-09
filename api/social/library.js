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
        const source = manga.source || 'anilist';
        const external_id = String(manga.external_id);

        // trova o crea il manga (senza ON CONFLICT, robusto rispetto ai vincoli DB)
        let mangaRecord;
        const { data: foundManga } = await admin
          .from('manga')
          .select('*')
          .eq('external_id', external_id)
          .eq('source', source)
          .limit(1);
        if (foundManga && foundManga.length) {
          mangaRecord = foundManga[0];
        } else {
          const { data: inserted, error: insErr } = await admin
            .from('manga')
            .insert([{ external_id, source, title: manga.title || null, cover_url: manga.cover_url || null, last_synced: new Date().toISOString() }])
            .select()
            .single();
          if (insErr) throw insErr;
          mangaRecord = inserted;
        }

        // se gia' in libreria, non duplicare
        const { data: foundUM } = await admin
          .from('user_manga')
          .select('*')
          .eq('user_id', user.id)
          .eq('manga_id', mangaRecord.id)
          .limit(1);
        if (foundUM && foundUM.length) {
          return res.status(200).json({ ok: true, manga: mangaRecord, user_manga: foundUM[0], already: true });
        }

        const { data: um, error: umErr } = await admin
          .from('user_manga')
          .insert([{
            user_id: user.id,
            manga_id: mangaRecord.id,
            external_id,
            source,
            status: 'plan',
            volumes_owned: 0,
            volumes_read: 0,
            bookmark: null,
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();
        if (umErr) throw umErr;

        return res.status(200).json({ ok: true, manga: mangaRecord, user_manga: um });
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

      if (body.action === 'update') {
        const manga_id = body.manga_id || null;
        const external_id = body.external_id || null;
        if (!manga_id && !external_id) return res.status(400).json({ error: 'missing manga_id/external_id' });
        const updates = {};
        if (body.status) updates.status = body.status;
        if (body.volumes_owned !== undefined) updates.volumes_owned = Math.max(0, Number(body.volumes_owned) || 0);
        if (body.volumes_read !== undefined) updates.volumes_read = Math.max(0, Number(body.volumes_read) || 0);
        if (body.edition_name !== undefined) updates.edition_name = body.edition_name || 'Standard';
        updates.updated_at = new Date().toISOString();
        let q = admin.from('user_manga').update(updates).eq('user_id', user.id);
        q = manga_id ? q.eq('manga_id', manga_id) : q.eq('external_id', external_id);
        const { data, error } = await q.select().single();
        if (error) throw error;
        return res.status(200).json({ ok: true, user_manga: data });
      }

      return res.status(400).json({ error: 'invalid_action' });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('library error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
