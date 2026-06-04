// src/components/Header.jsx
import React from 'react';

export default function Header({ user, onLogout, setView }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const isAdmin = user?.user_metadata?.role === 'admin';

  React.useEffect(() => {
    function onDocClick(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function toggleMenu(e) {
    e.stopPropagation();
    setOpen(o => !o);
  }

  function go(view) {
    setOpen(false);
    setView(view);
  }

  return (
    <header style={{
      height: 64,
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #eee',
      background: '#fff',
      position: 'fixed',
      top: 0,
      left: 220,
      right: 0,
      zIndex: 100
    }}>
      <div style={{ fontWeight: 700, fontSize: 18 }}>Shakou</div>

      <div ref={ref} style={{ position: 'relative' }}>
        <div
          onClick={toggleMenu}
          role="button"
          aria-haspopup="true"
          aria-expanded={open}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: '#ddd',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            userSelect: 'none'
          }}
        >
          {user ? (user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : user.email[0].toUpperCase()) : 'G'}
        </div>

        {open && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: 48,
            background: '#fff',
            border: '1px solid #eee',
            borderRadius: 8,
            boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
            width: 220,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            {!user && <button onClick={() => go('login')} style={{ padding: 8, textAlign: 'left' }}>Login</button>}

            {user && (
              <>
                <button onClick={() => go('profile')} style={{ padding: 8, textAlign: 'left' }}>Profilo</button>
                <button onClick={() => go('settings')} style={{ padding: 8, textAlign: 'left' }}>Impostazioni</button>
                {isAdmin && <button onClick={() => go('admin')} style={{ padding: 8, textAlign: 'left' }}>Admin Panel</button>}
                <button onClick={() => { setOpen(false); onLogout && onLogout(); }} style={{ padding: 8, textAlign: 'left', color: 'red' }}>Logout</button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
