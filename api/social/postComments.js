// api/social/postComments.js
// GET ?post_id=...  -> lista commenti di un post
// POST { post_id, body } -> crea un commento (richiede token)
import { admin, getUserFromRequest, parseBody, attachAuthors } from '../_auth.js';

const SELECT = 'id, post_id, user_id, body, created_at';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const post_id = (req.query.post_id || '').toString();
      if (!post_id) return res.status(400).json({ error: 'missing post_id' });
      const { data, error } = await admin
        .from('post_comments')
        .select(SELECT)
        .eq('post_id', post_id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const comments = await attachAuthors(data || []);
      return res.status(200).json({ ok: true, comments });
    }

    if (req.method === 'POST') {
      const user = await getUserFromRequest(req);
      if (!user) return res.status(401).json({ error: 'unauthorized' });
      const { post_id, body } = parseBody(req);
      const text = (body || '').toString().trim();
      if (!post_id || !text) return res.status(400).json({ error: 'missing post_id or body' });
      const { data, error } = await admin
        .from('post_comments')
        .insert([{ post_id, user_id: user.id, body: text }])
        .select(SELECT)
        .single();
      if (error) throw error;
      const [comment] = await attachAuthors([data]);
      return res.status(200).json({ ok: true, comment });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('postComments error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
