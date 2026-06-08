// api/manga-social.js
// Voti, recensioni e commenti su manga e capitoli (consolidato in una sola function).
//
// GET  ?source=&external_id=&scope=manga|chapter[&scope_number=N]
//      -> { ratings: { average, count, my_rating, reviews[] }, comments[] }
// POST { action:'rate', source, external_id, scope, scope_number, rating, body }
// POST { action:'comment', source, external_id, scope, scope_number, body }
import { admin, getUserFromRequest, parseBody, attachAuthors } from './_auth.js';

function readScope(q) {
  const source = (q.source || '').toString();
  const external_id = (q.external_id || '').toString();
  const scope = (q.scope || 'manga').toString() === 'chapter' ? 'chapter' : 'manga';
  let scope_number = (q.scope_number === undefined || q.scope_number === null || q.scope_number === '')
    ? null
    : Number(q.scope_number);
  if (scope === 'manga') scope_number = null;
  return { source, external_id, scope, scope_number };
}

function applyScope(query, scope_number) {
  return scope_number === null ? query.is('scope_number', null) : query.eq('scope_number', scope_number);
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { source, external_id, scope, scope_number } = readScope(req.query);
      if (!source || !external_id) return res.status(400).json({ error: 'missing source/external_id' });
      const user = await getUserFromRequest(req); // opzionale

      let rq = admin.from('manga_ratings')
        .select('id, user_id, rating, body, created_at, updated_at')
        .eq('source', source).eq('external_id', external_id).eq('scope', scope);
      rq = applyScope(rq, scope_number).order('updated_at', { ascending: false });
      const { data: ratings, error: rErr } = await rq;
      if (rErr) throw rErr;

      const count = ratings.length;
      const average = count ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : null;
      const mine = user ? (ratings.find(r => r.user_id === user.id) || null) : null;
      const reviews = await attachAuthors(ratings.filter(r => r.body && r.body.trim()));

      let cq = admin.from('manga_thread_comments')
        .select('id, user_id, body, created_at')
        .eq('source', source).eq('external_id', external_id).eq('scope', scope);
      cq = applyScope(cq, scope_number).order('created_at', { ascending: true });
      const { data: cmts, error: cErr } = await cq;
      if (cErr) throw cErr;
      const comments = await attachAuthors(cmts || []);

      return res.status(200).json({
        ok: true,
        ratings: { average, count, my_rating: mine ? { rating: mine.rating, body: mine.body } : null, reviews },
        comments
      });
    }

    if (req.method === 'POST') {
      const user = await getUserFromRequest(req);
      if (!user) return res.status(401).json({ error: 'unauthorized' });

      const body = parseBody(req);
      const { source, external_id, scope, scope_number } = readScope(body);
      if (!source || !external_id) return res.status(400).json({ error: 'missing source/external_id' });

      if (body.action === 'rate') {
        const rating = Number(body.rating);
        if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'invalid_rating' });
        const row = {
          user_id: user.id, source, external_id, scope, scope_number,
          rating, body: (body.body || '').toString().trim() || null,
          updated_at: new Date().toISOString()
        };
        // upsert manuale (scope_number nullable)
        let sel = admin.from('manga_ratings').select('id')
          .eq('user_id', user.id).eq('source', source).eq('external_id', external_id).eq('scope', scope);
        sel = applyScope(sel, scope_number).limit(1);
        const { data: existing } = await sel;
        if (existing && existing.length) {
          const { data, error } = await admin.from('manga_ratings').update(row).eq('id', existing[0].id).select().single();
          if (error) throw error;
          return res.status(200).json({ ok: true, rating: data });
        }
        const { data, error } = await admin.from('manga_ratings').insert([row]).select().single();
        if (error) throw error;
        return res.status(200).json({ ok: true, rating: data });
      }

      if (body.action === 'comment') {
        const text = (body.body || '').toString().trim();
        if (!text) return res.status(400).json({ error: 'empty_body' });
        const { data, error } = await admin.from('manga_thread_comments')
          .insert([{ user_id: user.id, source, external_id, scope, scope_number, body: text }])
          .select('id, user_id, body, created_at')
          .single();
        if (error) throw error;
        const [comment] = await attachAuthors([data]);
        return res.status(200).json({ ok: true, comment });
      }

      return res.status(400).json({ error: 'invalid_action' });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('manga-social error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
