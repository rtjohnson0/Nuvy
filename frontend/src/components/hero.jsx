import React from 'react';

export default function Hero({ onGetStarted }) {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-badge">Deploy static and React builds</div>
        <h1>Ship your frontend projects through Nuvy</h1>
        <p>
          Upload a ZIP or connect a GitHub repo, trigger a deployment, and track
          live status from one clean dashboard.
        </p>
        <button className="cta" onClick={onGetStarted}>
          Get Started
        </button>
        <div className="helper">
          Portfolio-ready deployment platform built for speed, visibility, and polish.
        </div>
      </div>

      <div className="hero-preview">
        <div className="preview-card">
          <div className="preview-header">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
          <div className="preview-console">
            <div>$ nuvy deploy my-portfolio.zip</div>
            <div>Uploading artifact...</div>
            <div>Validating project...</div>
            <div>Deploying to static host...</div>
            <div className="success-line">✔ Deployment live at /p/my-portfolio</div>
          </div>
        </div>
      </div>
    </section>
  );
}