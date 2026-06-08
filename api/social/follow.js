// api/social/follow.js
// Follow/unfollow unidirezionale. body: { following_id, action: 'follow'|'unfollow' }
import { admin, getUserFromRequest, parseBody } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const { following_id, action } = parseBody(req);
  if (!following_id) return res.status(400).json({ error: 'missing following_id' });
  if (following_id === user.id) return res.status(400).json({ error: 'cannot_follow_self' });

  try {
    if (action === 'unfollow') {
      const { error } = await admin
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', following_id);
      if (error) throw error;
      return res.status(200).json({ ok: true, following: false });
    }

    const { error } = await admin
      .from('user_follows')
      .upsert([{ follower_id: user.id, following_id }], { onConflict: 'follower_id,following_id' });
    if (error) throw error;
    return res.status(200).json({ ok: true, following: true });
  } catch (err) {
    console.error('follow error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
