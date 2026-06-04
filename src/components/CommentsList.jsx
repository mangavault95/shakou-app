import React, { useEffect, useState } from 'react';

/**
 * Props:
 * - chapterId: string
 * - refreshKey: any (optional) to force reload when parent changes
 */
export default function CommentsList({ chapterId, refreshKey }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load(page = 1, perPage = 50) {
    setLoading(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}/comments?page=${page}&perPage=${perPage}`);
      const json = await res.json();
      setComments(json.comments || []);
    } catch (e) {
      console.error('load comments', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!chapterId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, refreshKey]);

  if (!chapterId) return null;

  return (
    <div>
      <h4 style={{ marginTop: 12 }}>Commenti</h4>
      {loading && <div style={{ color: '#666' }}>Caricamento commenti…</div>}
      {!loading && comments.length === 0 && <div style={{ color: '#666' }}>Ancora nessun commento.</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {comments.map(c => (
          <li key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 13, color: '#333' }}>{c.body}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
              <span>{c.user_id ? `User ${c.user_id.slice(0,8)}` : 'Anon'}</span>
              <span style={{ marginLeft: 10 }}>{new Date(c.created_at).toLocaleString()}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
