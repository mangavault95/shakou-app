import React, { useEffect, useState } from 'react';
import CommentsList from '../components/CommentsList';
import CommentForm from '../components/CommentForm';

/**
 * Props:
 * - chapterId: string
 * - getAccessToken: async function that returns access token string
 * - onClose: function to close view
 */
export default function ChapterView({ chapterId, getAccessToken, onClose }) {
  const [chapter, setChapter] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [localComments, setLocalComments] = useState([]); // for optimistic UI

  useEffect(() => {
    if (!chapterId) return;
    async function load() {
      try {
        const res = await fetch(`/api/chapters/${chapterId}`);
        const json = await res.json();
        setChapter(json || null);
      } catch (e) {
        console.error('load chapter', e);
      }
    }
    load();
  }, [chapterId]);

  // optimistic add handler
  function handleOptimisticAdd(tempComment) {
    setLocalComments(prev => [tempComment, ...prev]);
  }

  // onPosted: replace optimistic or remove on error
  function handlePosted({ tempId, comment, error }) {
    if (error) {
      // remove optimistic
      setLocalComments(prev => prev.filter(c => c.id !== tempId));
      return;
    }
    // replace optimistic with real comment
    setLocalComments(prev => {
      const without = prev.filter(c => c.id !== tempId);
      return [comment, ...without];
    });
    // trigger reload of server comments list if needed
    setRefreshKey(k => k + 1);
  }

  if (!chapterId) return null;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => onClose && onClose()} style={{ marginBottom: 12 }}>← Indietro</button>
        <div style={{ fontSize: 14, color: '#666' }}>{chapter ? `Capitolo ${chapter.chapter_number || chapter.title}` : ''}</div>
      </div>

      {chapter && (
        <div style={{ marginTop: 12 }}>
          <h2 style={{ marginTop: 0 }}>{chapter.title || `Capitolo ${chapter.chapter_number}`}</h2>
          <div style={{ color: '#666', marginBottom: 12 }}>Pubblicato: {chapter.published_at ? new Date(chapter.published_at).toLocaleDateString() : '—'}</div>
          {chapter.preview_cover && <img src={chapter.preview_cover} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 12 }} />}
        </div>
      )}

      <div>
        <CommentForm
          chapterId={chapterId}
          getAccessToken={getAccessToken}
          onOptimisticAdd={handleOptimisticAdd}
          onPosted={handlePosted}
        />

        {/* render optimistic local comments first, then server comments list */}
        {localComments.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h4>In attesa di invio</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {localComments.map(c => (
                <li key={c.id} style={{ padding: '8px 0', borderBottom: '1px dashed #eee', opacity: c.optimistic ? 0.9 : 1 }}>
                  <div style={{ fontSize: 13 }}>{c.body}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{new Date(c.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <CommentsList chapterId={chapterId} refreshKey={refreshKey} />
      </div>
    </div>
  );
}
