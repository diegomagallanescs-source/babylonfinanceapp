import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const NAV = [
  { to: '/',                  label: 'River',   icon: '〜' },
  { to: '/ledger',            label: 'Ledger',  icon: '📊' },
  { to: '/income',            label: 'Income',  icon: '💰' },
  { to: '/spending',          label: 'Spending',icon: '🛒' },
  { to: '/investment-income', label: 'Passive', icon: '🌊' },
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
          <button className="profile-dropdown__signout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Layout() {
  return (
    <div className="app-shell">
      <ProfileMenu />
      <main className="app-shell__main">
        <Outlet />
      </main>
      <nav className="app-shell__nav">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
          >
            <span className="nav-item__icon">{icon}</span>
            <span className="nav-item__label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
