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
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, []);

  function go(view) { setOpen(false); setView(view); }

  const menuBtnStyle = {
    display: 'block', width: '100%', padding: '10px 14px',
    textAlign: 'left', background: 'none', border: 'none',
    borderRadius: 8, fontSize: 14, color: 'var(--text)',
    cursor: 'pointer', transition: 'background .12s',
  };

  return (
    <header style={{
      height: 60,
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      position: 'fixed',
      top: 0,
      left: isMobile ? 0 : 220,
      right: 0,
      zIndex: 3000,
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Sinistra: hamburger (mobile) oppure logo */}
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
            {[0,1,2].map(i => (
              <span key={i} style={{ display: 'block', width: 22, height: 2, background: 'var(--accent)', borderRadius: 2 }} />
            ))}
          </button>
        )}
        {isMobile && (
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)', letterSpacing: '-0.5px' }}>Shakou</span>
        )}
      </div>

      {/* Destra: avatar + dropdown */}
      <div ref={ref} style={{ position: 'relative', zIndex: 3100, marginLeft: 'auto' }}>
        <button
          onClick={e => { e.stopPropagation(); e.preventDefault(); setOpen(o => !o); }}
          aria-haspopup="true"
          aria-expanded={open}
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'var(--accent-light)',
            border: '2px solid var(--accent)',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, color: 'var(--accent)', fontSize: 15,
            overflow: 'hidden', padding: 0,
          }}
        >
          {user?.user_metadata?.avatar_url
            ? <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : user ? user.email[0].toUpperCase() : '✦'
          }
        </button>

        {open && (
          <div
            role="menu"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', right: 0, top: 46,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: 'var(--shadow)',
              width: 200, padding: 6,
              display: 'flex', flexDirection: 'column', gap: 2,
              zIndex: 3300,
            }}
          >
            {!user && <button style={menuBtnStyle} onClick={() => go('login')}>Accedi / Registrati</button>}
            {user && <>
              <button style={menuBtnStyle} onClick={() => go('profile')}>Profilo</button>
              <button style={menuBtnStyle} onClick={() => go('settings')}>Impostazioni</button>
              {isAdmin && <button style={menuBtnStyle} onClick={() => go('admin')}>Admin Panel</button>}
              <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
              <button style={{ ...menuBtnStyle, color: '#e11d48' }} onClick={() => { setOpen(false); onLogout?.(); }}>Logout</button>
            </>}
          </div>
        )}
      </div>
    </header>
  );
}
