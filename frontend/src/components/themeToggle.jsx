import React, { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [lightMode, setLightMode] = useState(() => {
    return localStorage.getItem('nuvy-theme') === 'light';
  });

  useEffect(() => {
    document.body.classList.toggle('light', lightMode);
    localStorage.setItem('nuvy-theme', lightMode ? 'light' : 'dark');
  }, [lightMode]);

  return (
    <button
      className="theme-toggle"
      aria-label="Toggle theme"
      onClick={() => setLightMode(prev => !prev)}
      title="Toggle theme"
    >
      {lightMode ? '🌞' : '🌙'}
    </button>
  );
}