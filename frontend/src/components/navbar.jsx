import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="nav">
      <div className="logo">
        <div className="logo-icon" />
        <Link to="/">Nuvy</Link>
      </div>

      <button
        className="hamburger"
        aria-label="Toggle menu"
        onClick={() => setMenuOpen(open => !open)}>
        <span />
        <span />
        <span />
      </button>

      <div className={`nav-links${menuOpen ? ' active' : ''}`}>
        <Link to="/projects" onClick={() => setMenuOpen(false)}>Projects</Link>
        <Link to="/docs" onClick={() => setMenuOpen(false)}>Docs</Link>
        <Link to="/deployments" onClick={() => setMenuOpen(false)}>Deployments</Link>
      </div>
    </nav>
  );
}