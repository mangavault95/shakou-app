// api/chapters/[id]/comments.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { id } = req.query; // chapter id
  if (!id) return res.status(400).json({ error: 'missing chapter id' });

  try {
    if (req.method === 'GET') {
      const page = Number(req.query.page || 1);
      const perPage = Number(req.query.perPage || 50);
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const { data, error } = await supabase
        .from('comments')
        .select('id, user_id, body, parent_id, visibility, created_at, updated_at')
        .eq('chapter_id', id)
        .eq('visibility', 'public')
        .order('created_at', { ascending: true })
        .range(from, to);

      if (error) throw error;
      return res.status(200).json({ comments: data || [] });
    }

    if (req.method === 'POST') {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim();
      if (!token) return res.status(401).json({ error: 'missing auth token' });

      // verify user token
      const authClient = createClient(SUPABASE_URL, token);
      const { data: userData, error: userErr } = await authClient.auth.getUser();
      if (userErr || !userData?.user) return res.status(401).json({ error: 'invalid token' });

      const user = userData.user;
      const { body, parent_id } = req.body || {};
      if (!body || typeof body !== 'string' || body.trim().length === 0) {
        return res.status(400).json({ error: 'empty body' });
      }

      const insert = {
        user_id: user.id,
        chapter_id: id,
        body: body.trim(),
        parent_id: parent_id || null,
        visibility: 'public',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('comments')
        .insert([insert])
        .select()
        .single();

      if (insertErr) throw insertErr;
      return res.status(201).json({ comment: inserted });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('api/chapters/[id]/comments error', err);
    return res.status(500).json({ error: String(err) });
  }
}
