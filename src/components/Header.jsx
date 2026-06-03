// src/components/Header.jsx
import React from 'react';

export default function Header({ user, onLogout, setView }) {
  const [open, setOpen] = React.useState(false);

  const isAdmin = user?.user_metadata?.role === 'admin';

  function toggleMenu() {
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
      position: 'relative'
    }}>
      <div style={{ fontWeight: 700, fontSize: 18 }}>Shakou</div>

      {/* ICONA PROFILO */}
      <div style={{ position: 'relative' }}>
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
            fontWeight: 700,
            userSelect: 'none'
          }}
        >
          {user ? user.email[0].toUpperCase() : 'G'}
        </div>

        {/* MENU A TENDINA */}
        {open && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: 48,
            background: '#fff',
            border: '1px solid #eee',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            width: 180,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            zIndex: 100
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
