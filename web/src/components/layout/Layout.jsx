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
    <div className="h-screen flex flex-col bg-background-light font-display">
      {/* Dark mode toggle - fixed top right */}
      <button
        onClick={() => setDark(!dark)}
        className="fixed top-4 right-4 z-40 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center text-lg hover:scale-110 transition-transform border border-muted/30"
        aria-label={dark ? 'Schakel naar licht thema' : 'Schakel naar donker thema'}
      >
        {dark ? '☀️' : '🌙'}
      </button>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-32" style={{ WebkitOverflowScrolling: 'touch' }}>
        {children}
      </main>

      {/* Floating pill navigation */}
      <nav
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-[0_20px_40px_rgba(38,70,83,0.15)] p-2 flex gap-2 border border-[#E9ECEF]/30 z-50 ${
          isTabletMode ? 'nav-pill-tablet' : ''
        }`}
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
                w-14 h-14 lg:landscape:w-[72px] lg:landscape:h-[72px]
                ${
                  isActive
                    ? 'bg-primary/30 text-primary border border-primary/20'
                    : 'text-text-main/50 hover:bg-muted/30 border border-transparent'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-xl lg:landscape:text-2xl leading-none">{item.icon}</span>
              <span className="text-[9px] font-medium mt-0.5 leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
