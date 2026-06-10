// src/pages/Feed.jsx
import React from 'react';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';
import UserSearch from '../components/UserSearch';
import { getAccessToken } from '../utils/auth';
import useIsMobile from '../hooks/useIsMobile';

export default function Feed({ user }) {
  const [posts, setPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const isMobile = useIsMobile();

  async function fetchFeed() {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/social/feed', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const json = await res.json();
      setPosts(json.posts || []);
    } catch (e) {
      console.error('fetchFeed failed', e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function handlePosted(post) {
    setPosts(p => [{ ...post, like_count: 0, comment_count: 0, liked_by_me: false }, ...p]);
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) 300px',
      gap: 20,
      maxWidth: 1000,
      margin: '0 auto',
      alignItems: 'start'
    }}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ marginTop: 0 }}>Home</h2>
        <PostComposer user={user} onPosted={handlePosted} />
        {loading ? (
          <div style={{ color: '#666' }}>Caricamento…</div>
        ) : posts.length === 0 ? (
          <div style={{ color: '#666' }}>Ancora nessun post. Segui qualcuno o scrivi il primo!</div>
        ) : (
          posts.map(p => <PostCard key={p.id} post={p} user={user} />)
        )}
      </div>
      {!isMobile && (
        <aside style={{ position: 'sticky', top: 80 }}>
          <UserSearch user={user} onChanged={fetchFeed} />
        </aside>
      )}
    </div>
  );
}
