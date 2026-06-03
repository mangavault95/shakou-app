import React from 'react';
import PostComposer from '../components/PostComposer';
import { supabase } from '../supabase';

export default function Feed({ user }) {
  const [posts, setPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => { fetchFeed(); }, []);

  async function fetchFeed() {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('id,user_id,content,manga_id,media,created_at, users:profiles(full_name,email,id)')
      .order('created_at', { ascending: false })
      .limit(50);
    setLoading(false);
    if (error) return console.log('fetchFeed', error.message);
    setPosts(data || []);
  }

  return (
    <div style={{ padding:20 }}>
      <h2>Feed</h2>
      <PostComposer user={user} onPosted={() => fetchFeed()} />
      {loading ? <div>Caricamento...</div> : posts.map(p => (
        <div key={p.id} style={{ border:'1px solid #eee', padding:12, marginBottom:12 }}>
          <div style={{ fontWeight:700 }}>{p.users?.full_name || p.users?.email}</div>
          <div style={{ color:'#666', fontSize:13 }}>{new Date(p.created_at).toLocaleString()}</div>
          <div style={{ marginTop:8 }}>{p.content}</div>
          {/* actions: like, comment (implementa componenti separati) */}
        </div>
      ))}
    </div>
  );
}
