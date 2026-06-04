// api/manga/[id].js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'missing id' });

    // fetch manga row
    const { data: manga, error: mangaErr } = await supabase
      .from('manga')
      .select('id, external_id, source, title, cover_url, synopsis, synopsis_translated, genres, status, popularity_score')
      .eq('id', id)
      .single();

    if (mangaErr) return res.status(500).json({ error: mangaErr.message });

    // counts
    const { count: volumesCount } = await supabase
      .from('volumes')
      .select('id', { count: 'exact', head: true })
      .eq('manga_id', id);

    const { count: chaptersCount } = await supabase
      .from('chapters')
      .select('id', { count: 'exact', head: true })
      .eq('manga_id', id);

    // volumes list (first 50)
    const { data: volumes } = await supabase
      .from('volumes')
      .select('id, volume_number, title, published_at')
      .eq('manga_id', id)
      .order('volume_number', { ascending: true })
      .limit(50);

    // add chapters_count per volume
    const volumesWithCounts = await Promise.all((volumes || []).map(async v => {
      const { count } = await supabase
        .from('chapters')
        .select('id', { count: 'exact', head: true })
        .eq('volume_id', v.id);
      return { ...v, chapters_count: count || 0 };
    }));

    const out = {
      ...manga,
      synopsis_display: manga.synopsis_translated || manga.synopsis || '',
      volumes_count: volumesCount || 0,
      chapters_count: chaptersCount || 0,
      volumes: volumesWithCounts || []
    };

    return res.status(200).json(out);
  } catch (err) {
    console.error('api/manga/[id] error', err);
    return res.status(500).json({ error: String(err) });
  }
}
