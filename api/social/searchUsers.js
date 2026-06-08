// api/social/searchUsers.js
// Cerca utenti per nome/email e indica se il lettore li segue gia'.
import { admin, getUserFromRequest } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const user = await getUserFromRequest(req);
  // rimuovi caratteri che romperebbero la sintassi del filtro PostgREST
  const q = (req.query.q || '').toString().trim().replace(/[,()]/g, ' ').trim();

  try {
    let query = admin.from('profiles').select('id, full_name, email').limit(20);
    if (q) {
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
    } else {
      query = query.order('created_at', { ascending: false });
    }
    const { data: profiles, error } = await query;
    if (error) throw error;

    let followingSet = new Set();
    if (user) {
      const { data: follows } = await admin
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);
      followingSet = new Set((follows || []).map(f => f.following_id));
    }

    const out = (profiles || [])
      .filter(p => !user || p.id !== user.id) // non mostrare me stesso
      .map(p => ({ id: p.id, full_name: p.full_name, email: p.email, is_following: followingSet.has(p.id) }));

    return res.status(200).json({ ok: true, users: out });
  } catch (err) {
    console.error('searchUsers error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
