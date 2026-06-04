// api/social/mangaComments.js
// Simple service that inserts/reads from table `manga_comments`
// Note: place this file in api/social/ and ensure env vars are set.

import { createClient } from '@supabase/supabase-js';

const SYNC_SECRET = process.env.SYNC_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const token = req.headers['x-sync-token'];
  if (!token || token !== SYNC_SECRET) return res.status(401).json({ error: 'unauthorized' });

  try {
    if (req.method === 'POST') {
      const { user_id, manga_id, content } = req.body || {};
      if (!user_id || !manga_id || !content) return res.status(400).json({ error: 'missing' });

      const row = { manga_id, user_id, content, created_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('manga_comments')
        .insert([row])
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ ok: true, comment: data });
    } else {
      const { manga_id } = req.query;
      if (!manga_id) return res.status(400).json({ error: 'missing manga_id' });

      const { data, error } = await supabase
        .from('manga_comments')
        .select('*')
        .eq('manga_id', manga_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ ok: true, comments: data });
    }
  } catch (err) {
    console.error('api/social/mangaComments error', err);
    return res.status(500).json({ error: String(err) });
  }
}
