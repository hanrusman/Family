import React, { useState, useEffect } from 'react';

export default function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('darkMode', String(dark));
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="dark-mode-toggle"
      aria-label={dark ? 'Schakel naar licht thema' : 'Schakel naar donker thema'}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
