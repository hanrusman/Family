import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './Layout.css';

const NAV_ITEMS = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/kalender', icon: '📅', label: 'Kalender' },
  { path: '/klusjes', icon: '🧹', label: 'Klusjes' },
  { path: '/menu', icon: '🍽️', label: 'Menu' },
  { path: '/boodschappen', icon: '🛒', label: 'Boodschappen' },
  { path: '/weer', icon: '🌤️', label: 'Weer' },
];

const SETTINGS_ITEM = { path: '/instellingen', icon: '⚙️', label: 'Instellingen' };

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isTabletMode } = useApp();

  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('fk_theme');
    return stored === 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('fk_theme', dark ? 'dark' : 'light');
  }, [dark]);

  const navItems = isTabletMode ? NAV_ITEMS : [...NAV_ITEMS, SETTINGS_ITEM];

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Dark mode toggle */}
      <button
        onClick={() => setDark(!dark)}
        className="fixed top-3 right-3 z-40 w-9 h-9 rounded-full bg-[var(--bg-card)] flex items-center justify-center text-base hover:scale-110 transition-transform border border-[var(--border-color)]"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        aria-label={dark ? 'Schakel naar licht thema' : 'Schakel naar donker thema'}
      >
        {dark ? '☀️' : '🌙'}
      </button>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
        {children}
      </main>

      {/* Floating pill navigation */}
      <nav
        className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] rounded-full p-1.5 sm:p-2 flex gap-0.5 sm:gap-1 border border-[var(--border-color)] z-50 max-w-[95vw]"
        style={{ boxShadow: '0 8px 32px rgba(38,70,83,0.12)' }}
        role="navigation"
        aria-label="Hoofdnavigatie"
      >
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === '/' && location.pathname === '/');
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center rounded-full transition-all duration-200
                w-11 h-11 sm:w-14 sm:h-14
                ${
                  isActive
                    ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-lg sm:text-xl leading-none">{item.icon}</span>
              <span className="text-[8px] sm:text-[9px] font-medium mt-0.5 leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent)]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
