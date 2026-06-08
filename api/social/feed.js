// api/social/feed.js
// Ritorna i post visibili al lettore: pubblici di chiunque + 'followers' di chi
// segue (e i propri), con autore, conteggi like/commenti e flag liked_by_me.
import { admin, getUserFromRequest, attachAuthors } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const user = await getUserFromRequest(req); // puo' essere null (anonimo)

  try {
    // utenti i cui post 'followers' posso vedere (chi seguo + me stesso)
    let allowed = [];
    if (user) {
      const { data: follows } = await admin
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);
      allowed = (follows || []).map(f => f.following_id);
      allowed.push(user.id);
    }

    let query = admin
      .from('posts')
      .select('id, user_id, content, manga_id, visibility, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (allowed.length > 0) {
      query = query.or(`visibility.eq.public,and(visibility.eq.followers,user_id.in.(${allowed.join(',')}))`);
    } else {
      query = query.eq('visibility', 'public');
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    const ids = (posts || []).map(p => p.id);
    const likeCounts = {};
    const commentCounts = {};
    const likedByMe = new Set();

    if (ids.length) {
      const { data: likes } = await admin.from('likes').select('post_id, user_id').in('post_id', ids);
      (likes || []).forEach(l => {
        likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1;
        if (user && l.user_id === user.id) likedByMe.add(l.post_id);
      });
      const { data: cmts } = await admin.from('post_comments').select('post_id').in('post_id', ids);
      (cmts || []).forEach(c => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });
    }

    const withAuthors = await attachAuthors(posts || []);
    const out = withAuthors.map(p => ({
      ...p,
      like_count: likeCounts[p.id] || 0,
      comment_count: commentCounts[p.id] || 0,
      liked_by_me: likedByMe.has(p.id)
    }));

    return res.status(200).json({ ok: true, posts: out, me: user ? user.id : null });
  } catch (err) {
    console.error('feed error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
