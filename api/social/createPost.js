// api/social/createPost.js
import { admin, getUserFromRequest, parseBody, attachAuthors } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const { content, manga_id, visibility } = parseBody(req);
  const text = (content || '').toString().trim();
  if (!text) return res.status(400).json({ error: 'empty_content' });

  const vis = visibility === 'followers' ? 'followers' : 'public';

  try {
    const { data, error } = await admin
      .from('posts')
      .insert([{ user_id: user.id, content: text, manga_id: manga_id || null, visibility: vis }])
      .select('id, user_id, content, manga_id, visibility, created_at')
      .single();
    if (error) throw error;
    const [post] = await attachAuthors([data]);
    return res.status(200).json({ ok: true, post });
  } catch (err) {
    console.error('createPost error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
