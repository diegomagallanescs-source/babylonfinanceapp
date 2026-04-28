import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const NAV = [
  { to: '/',            label: 'Home',         end: true },
  { to: '/accounting',  label: 'Accounting',   end: false },
  { to: '/money-in',    label: 'Money In',     end: false },
  { to: '/money-out',   label: 'Money Out',    end: false },
  { to: '/investing',   label: 'Investing',    end: false },
  { to: '/real-estate', label: 'Real Estate',  end: false },
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
      <button className="profile-btn" onClick={() => setOpen((o) => !o)} aria-label="Profile">
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
        <ProfileMenu />
      </header>
      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
