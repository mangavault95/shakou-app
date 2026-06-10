// src/components/Header.jsx
import React from 'react';
import useIsMobile from '../hooks/useIsMobile';

export default function Header({ user, onLogout, setView, onHamburger }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const isMobile = useIsMobile();

  const isAdmin = user?.user_metadata?.role === 'admin';

  React.useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, []);

  function toggleMenu(e) {
    e.stopPropagation();
    e.preventDefault();
    setOpen(o => !o);
  }

  function go(view) {
    setOpen(false);
    setView(view);
  }

  return (
    <header
      style={{
        height: 64,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #eee',
        background: '#fff',
        position: 'fixed',
        top: 0,
        left: isMobile ? 0 : 220,
        right: 0,
        zIndex: 3000
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isMobile && (
          <button
            onClick={onHamburger}
            aria-label="Apri menu"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, display: 'flex', flexDirection: 'column', gap: 5
            }}
          >
            <span style={{ display: 'block', width: 22, height: 2, background: '#222', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 22, height: 2, background: '#222', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 22, height: 2, background: '#222', borderRadius: 2 }} />
          </button>
        )}
        <div style={{ fontWeight: 700, fontSize: 18 }}>Shakou</div>
      </div>

      <div ref={ref} style={{ position: 'relative', zIndex: 3100 }}>
        <button
          onClick={toggleMenu}
          aria-haspopup="true"
          aria-expanded={open}
          style={{
            position: 'relative',
            zIndex: 3200,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#ddd',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            border: 'none',
            padding: 0,
            userSelect: 'none',
            pointerEvents: 'auto'
          }}
        >
          {user ? (user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : user.email[0].toUpperCase()) : 'G'}
        </button>

        {open && (
          <div
            role="menu"
            style={{
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
              gap: 6,
              zIndex: 3300
            }}
            onClick={e => e.stopPropagation()}
          >
            {!user && <button onClick={() => go('login')} style={{ padding: 8, textAlign: 'left' }}>Login</button>}

            {user && (
              <>
                <button onClick={() => go('profile')} style={{ padding: 8, textAlign: 'left' }}>Profilo</button>
                <button onClick={() => go('settings')} style={{ padding: 8, textAlign: 'left' }}>Impostazioni</button>
                {isAdmin && <button onClick={() => go('admin')} style={{ padding: 8, textAlign: 'left' }}>Admin Panel</button>}
                <button onClick={() => { setOpen(false); onLogout?.(); }} style={{ padding: 8, textAlign: 'left', color: 'red' }}>Logout</button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
