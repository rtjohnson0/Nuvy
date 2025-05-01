import React, { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [lightMode, setLightMode] = useState(false);

  // Toggle body class on state change
  useEffect(() => {
    document.body.classList.toggle('light', lightMode);
  }, [lightMode]);

  return (
    <button
      className="theme-toggle"
      aria-label="Toggle theme"
      onClick={() => setLightMode(prev => !prev)}
    >
      {lightMode ? '🌞' : '🌜'}
    </button>
  );
}
