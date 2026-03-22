import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './Layout.css';

const NAV_ITEMS = [
  { path: '/kalender', icon: '📅', label: 'Kalender' },
  { path: '/klusjes', icon: '✅', label: 'Klusjes' },
  { path: '/menu', icon: '🍽️', label: 'Menu' },
  { path: '/boodschappen', icon: '🛒', label: 'Boodschappen' },
];

const SETTINGS_ITEM = { path: '/instellingen', icon: '⚙️', label: 'Instellingen' };

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isTabletMode } = useApp();

  const navItems = isTabletMode ? NAV_ITEMS : [...NAV_ITEMS, SETTINGS_ITEM];

  const navContent = (
    <nav className="nav-bar" role="navigation" aria-label="Hoofdnavigatie">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path ||
          (item.path === '/kalender' && location.pathname === '/');
        return (
          <button
            key={item.path}
            className={`nav-item ${isActive ? 'nav-active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="layout">
      {/* Sidebar nav for tablet landscape */}
      <div className="layout-sidebar">
        {navContent}
      </div>

      <main className="layout-content">
        {children}
      </main>

      {/* Bottom tab bar for phone/portrait */}
      <div className="layout-bottom-bar">
        {navContent}
      </div>
    </div>
  );
}
