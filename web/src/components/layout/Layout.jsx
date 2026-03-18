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

  return (
    <div className="layout">
      <main className="layout-content">
        {children}
      </main>

      <nav className="tab-bar" role="navigation" aria-label="Hoofdnavigatie">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === '/kalender' && location.pathname === '/');
          return (
            <button
              key={item.path}
              className={`tab-item ${isActive ? 'tab-active' : ''}`}
              onClick={() => navigate(item.path)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="tab-icon">{item.icon}</span>
              <span className="tab-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
