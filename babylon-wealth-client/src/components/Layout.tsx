import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const NAV = [
  { to: '/',            label: 'Home',        end: true  },
  { to: '/accounting',  label: 'Accounting',  end: false },
  { to: '/money-in',    label: 'Money In',    end: false },
  { to: '/money-out',   label: 'Money Out',   end: false },
  { to: '/investing',   label: 'Investing',   end: false },
  { to: '/real-estate', label: 'Real Estate', end: false },
  { to: '/projections', label: 'Projections', end: false },
];

function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.firstName
    ? user.firstName[0].toUpperCase()
    : user?.email?.[0].toUpperCase() ?? '?';

  return (
    <div className="profile-menu" ref={ref}>
      <button className="profile-btn" onClick={() => setOpen(o => !o)} aria-label="Profile">
        {initials}
      </button>
      {open && (
        <div className="profile-dropdown">
          <div className="profile-dropdown__info">
            <div className="profile-dropdown__name">{user?.firstName ?? user?.email}</div>
            {user?.firstName && <div className="profile-dropdown__email">{user.email}</div>}
          </div>
          <hr className="profile-dropdown__divider" />
          <button className="profile-dropdown__signout" onClick={handleLogout}>Sign out</button>
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') !== 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <button
      className="theme-toggle"
      onClick={() => setIsDark(d => !d)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
          <line x1="12" y1="2" x2="12" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="20" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="2" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="20" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

export function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">✦ Babylon</div>

        <nav className="app-header__nav">
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `header-nav-item${isActive ? ' header-nav-item--active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="app-header__right">
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </header>
      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
