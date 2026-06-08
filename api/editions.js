// api/editions.js
// Repo centrale: edizioni italiane dei manga + statistiche libreria utente.
//
// GET ?source=&external_id=            -> volumi/edizioni per un manga
// GET ?user_stats=1                    -> statistiche aggregate libreria (auth required)
// POST { source, external_id, volumes: [{volume_number, publisher, title, price, release_date, isbn}] }
//      -> upsert edizioni (admin only)
import { admin, getUserFromRequest, parseBody } from './_auth.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

async function isAdmin(user) {
  if (!user) return false;
  if (ADMIN_EMAIL && user.email === ADMIN_EMAIL) return true;
  const { data } = await admin.from('profiles').select('role').eq('id', user.id).single();
  return data?.role === 'admin';
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Statistiche aggregate libreria utente
      if ((req.query.user_stats || '').toString() === '1') {
        const user = await getUserFromRequest(req);
        if (!user) return res.status(401).json({ error: 'unauthorized' });

        const { data: items, error } = await admin
          .from('user_library_stats_view')
          .select('source, external_id, status, volumes_owned, volumes_read, publisher, owned_value')
          .eq('user_id', user.id);
        if (error) throw error;

        const stats = computeStats(items || []);
        return res.status(200).json({ ok: true, stats });
      }

      // Edizioni per un singolo manga
      const source = (req.query.source || '').toString();
      const external_id = (req.query.external_id || '').toString();
      if (!source || !external_id) return res.status(400).json({ error: 'missing source/external_id' });

      const { data, error } = await admin
        .from('manga_editions')
        .select('volume_number, publisher, title, price, release_date, isbn')
        .eq('source', source)
        .eq('external_id', external_id)
        .order('volume_number', { ascending: true });
      if (error) throw error;

      return res.status(200).json({ ok: true, editions: data || [] });
    }

    if (req.method === 'POST') {
      const user = await getUserFromRequest(req);
      if (!user) return res.status(401).json({ error: 'unauthorized' });
      if (!(await isAdmin(user))) return res.status(403).json({ error: 'forbidden' });

      const body = parseBody(req);
      const source = (body.source || '').toString();
      const external_id = (body.external_id || '').toString();
      const volumes = Array.isArray(body.volumes) ? body.volumes : [];
      if (!source || !external_id) return res.status(400).json({ error: 'missing source/external_id' });
      if (!volumes.length) return res.status(400).json({ error: 'empty volumes array' });

      const rows = volumes
        .filter(v => v && Number.isInteger(Number(v.volume_number)))
        .map(v => ({
          source,
          external_id,
          volume_number: Number(v.volume_number),
          publisher: (v.publisher || '').toString().trim() || null,
          title: (v.title || '').toString().trim() || null,
          price: v.price != null ? Number(v.price) : null,
          release_date: v.release_date || null,
          isbn: (v.isbn || '').toString().trim() || null,
          updated_at: new Date().toISOString()
        }));

      // upsert via delete+insert per evitare conflitti su unique constraint
      const volNums = rows.map(r => r.volume_number);
      await admin.from('manga_editions')
        .delete()
        .eq('source', source).eq('external_id', external_id)
        .in('volume_number', volNums);

      const { data, error } = await admin.from('manga_editions').insert(rows).select();
      if (error) throw error;

      return res.status(200).json({ ok: true, upserted: data?.length || 0 });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('editions error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}

function computeStats(items) {
  const seriesCount = items.length;
  const totalOwned = items.reduce((s, i) => s + (Number(i.volumes_owned) || 0), 0);
  const totalRead = items.reduce((s, i) => s + (Number(i.volumes_read) || 0), 0);
  const collectionValue = items.reduce((s, i) => s + (Number(i.owned_value) || 0), 0);

  const statusBreakdown = {};
  for (const i of items) {
    const st = i.status || 'sconosciuto';
    statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;
  }

  const publisherBreakdown = {};
  for (const i of items) {
    if (i.publisher) {
      publisherBreakdown[i.publisher] = (publisherBreakdown[i.publisher] || 0) + 1;
    }
  }
  const topPublisher = Object.entries(publisherBreakdown)
    .sort((a, b) => b[1] - a[1])[0] || null;

  return {
    seriesCount,
    totalOwned,
    totalRead,
    collectionValue: Math.round(collectionValue * 100) / 100,
    statusBreakdown,
    publisherBreakdown,
    topPublisher: topPublisher ? { name: topPublisher[0], count: topPublisher[1] } : null
  };
}
