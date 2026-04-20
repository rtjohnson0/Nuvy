import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="nav">
      <div className="logo">
        <Link to="/" onClick={closeMenu} className="logo-link">
          <img
            src="/images/nuvy-logo.png"
            alt="Nuvy logo"
            className="logo-image"
          />
          <span className="logo-text">Nuvy</span>
        </Link>
      </div>

      <button
        className="hamburger"
        aria-label="Toggle menu"
        onClick={() => setMenuOpen(open => !open)}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`nav-links${menuOpen ? ' active' : ''}`}>
        <Link
          to="/"
          onClick={closeMenu}
          className={location.pathname === '/' ? 'active-link' : ''}
        >
          Home
        </Link>
        <Link
          to="/projects"
          onClick={closeMenu}
          className={location.pathname === '/projects' ? 'active-link' : ''}
        >
          Projects
        </Link>
        <Link
          to="/deployments"
          onClick={closeMenu}
          className={location.pathname === '/deployments' ? 'active-link' : ''}
        >
          Deployments
        </Link>
      </div>
    </nav>
  );
}