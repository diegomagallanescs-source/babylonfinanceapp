import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';

const NAV = [
  { to: '/',                  label: 'River',   icon: '〜' },
  { to: '/ledger',            label: 'Ledger',  icon: '📊' },
  { to: '/income',            label: 'Income',  icon: '💰' },
  { to: '/spending',          label: 'Spending',icon: '🛒' },
  { to: '/investment-income', label: 'Passive', icon: '🌊' },
];

export function Layout() {
  return (
    <div className="app-shell">
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
