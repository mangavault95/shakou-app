// src/components/Header.jsx
import React from 'react';

export default function Header({ user, onLogout, setView }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  const isAdmin = user?.user_metadata?.role === 'admin';

  React.useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
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
      marginLeft: 220,
      background: '#fff',
      position: 'relative',
      zIndex: 100
    }}>
      <div style={{ fontWeight: 700, fontSize: 18 }}>Shakou</div>

      <div ref={ref} style={{ position: 'relative' }}>
        <div
          onClick={toggleMenu}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: '#ddd',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700
          }}
        >
          {user ? user.email[0].toUpperCase() : 'G'}
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
            width: 200,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            {!user && (
              <button onClick={() => go('login')} style={{ padding: 8 }}>Login</button>
            )}

            {user && (
              <>
                <button onClick={() => go('profile')} style={{ padding: 8 }}>Profilo</button>
                <button onClick={() => go('settings')} style={{ padding: 8 }}>Impostazioni</button>
                {isAdmin && (
                  <button onClick={() => go('admin')} style={{ padding: 8 }}>Admin Panel</button>
                )}
                <button onClick={onLogout} style={{ padding: 8, color: 'red' }}>Logout</button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
