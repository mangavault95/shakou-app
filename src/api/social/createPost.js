// api/social/createPost.js
import { supabaseUpsertSingle } from '../_supabaseService.js'; // usa helper già creato in fase B

export default async function handler(req, res) {
  const user = req.body.user_id; // lato server: verifica auth o passa auth.uid() dal client
  const { content, manga_id, media } = req.body;
  if (!user || !content) return res.status(400).json({ error: 'missing' });

  try {
    const row = {
      user_id: user,
      content,
      manga_id: manga_id || null,
      media: media ? JSON.stringify(media) : null,
      created_at: new Date().toISOString()
    };
    const created = await supabaseUpsertSingle('posts', row, 'id');
    // create notification via service role for followers (optional)
    return res.status(200).json({ ok: true, post: created });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
