// api/social/like.js
// Like/unlike di un post. body: { post_id, action: 'like'|'unlike' }
import { admin, getUserFromRequest, parseBody } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const { post_id, action } = parseBody(req);
  if (!post_id) return res.status(400).json({ error: 'missing post_id' });

  try {
    if (action === 'unlike') {
      await admin.from('likes').delete().eq('user_id', user.id).eq('post_id', post_id);
    } else {
      // evita like duplicati
      const { data: existing } = await admin
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', post_id)
        .limit(1);
      if (!existing || existing.length === 0) {
        await admin.from('likes').insert([{ user_id: user.id, post_id, created_at: new Date().toISOString() }]);
      }
    }

    const { count } = await admin
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', post_id);

    return res.status(200).json({ ok: true, liked: action !== 'unlike', like_count: count || 0 });
  } catch (err) {
    console.error('like error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
