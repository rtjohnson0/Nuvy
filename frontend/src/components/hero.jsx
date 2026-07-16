import React, { useEffect, useRef, useState } from 'react';

const TERMINAL_LINES = [
  { text: '$ nuvy deploy my-portfolio.zip', type: 'cmd',     delay: 0    },
  { text: '  Uploading artifact...',         type: 'info',   delay: 600  },
  { text: '  Extracting files...',           type: 'info',   delay: 1100 },
  { text: '  Detecting project type...',     type: 'info',   delay: 1600 },
  { text: '  ✔ React project detected',      type: 'ok',     delay: 2000 },
  { text: '  Running npm run build...',      type: 'warn',   delay: 2500 },
  { text: '  Pushing to GitHub Pages...',    type: 'info',   delay: 3200 },
  { text: '  ✔ Live at rtjohnson0.github.io/my-portfolio', type: 'ok', delay: 4000 },
];

const STATS = [
  { value: '< 60s', label: 'Avg deploy time' },
  { value: 'Free',  label: 'GitHub Pages hosting' },
  { value: 'ZIP',   label: '& GitHub repo support' },
];

export default function Hero({ onGetStarted }) {
  const [visibleLines, setVisibleLines] = useState([]);
  const [showCursor, setShowCursor] = useState(true);
  const termRef = useRef(null);

  // Typewriter — replay on loop
  useEffect(() => {
    let timeouts = [];
    let loopTimeout;

    const run = () => {
      setVisibleLines([]);
      TERMINAL_LINES.forEach((line, i) => {
        const t = setTimeout(() => {
          setVisibleLines(prev => [...prev, line]);
          if (termRef.current) {
            termRef.current.scrollTop = termRef.current.scrollHeight;
          }
        }, line.delay);
        timeouts.push(t);
      });
      // Loop after last line + pause
      const lastDelay = TERMINAL_LINES[TERMINAL_LINES.length - 1].delay;
      loopTimeout = setTimeout(run, lastDelay + 3000);
    };

    run();
    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(loopTimeout);
    };
  }, []);

  // Blinking cursor
  useEffect(() => {
    const iv = setInterval(() => setShowCursor(c => !c), 530);
    return () => clearInterval(iv);
  }, []);

  return (
    <section className="hero">
      <div className="hero-content">

        {/* Pulsing badge */}
        <div className="hero-badge">
          <span className="hero-badge__dot" />
          Now deploying to GitHub Pages
        </div>

        <h1 className="hero-title">
          Ship your project.<br />
          <span className="hero-title__accent">Live in seconds.</span>
        </h1>

        <p className="hero-sub">
          Upload a ZIP or connect a GitHub repo. Nuvy handles
          the build, the deploy, and hands you back a live URL.
          No config. No cloud credits. No waiting.
        </p>

        <div className="hero-actions">
          <button className="cta" onClick={onGetStarted}>
            Deploy now →
          </button>
          <a href="/projects" className="hero-link">
            View projects ↗
          </a>
        </div>

        {/* Stats row */}
        <div className="hero-stats">
          {STATS.map(s => (
            <div className="hero-stat" key={s.label}>
              <span className="hero-stat__value">{s.value}</span>
              <span className="hero-stat__label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Terminal preview */}
      <div className="hero-preview">
        <div className="preview-card">
          <div className="preview-header">
            <span className="dot dot--red" />
            <span className="dot dot--yellow" />
            <span className="dot dot--green" />
            <span className="preview-header__title">nuvy — deploy</span>
          </div>

          <div className="preview-console" ref={termRef}>
            {visibleLines.map((line, i) => (
              <div
                key={i}
                className={`console-line console-line--${line.type}`}
              >
                {line.text}
                {i === visibleLines.length - 1 && (
                  <span
                    className="console-cursor"
                    style={{ opacity: showCursor ? 1 : 0 }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Deploy progress bar — animates after last line appears */}
          <div className="preview-footer">
            <div className="preview-progress">
              <div
                className="preview-progress__fill"
                style={{
                  width: visibleLines.length === TERMINAL_LINES.length ? '100%' : `${(visibleLines.length / TERMINAL_LINES.length) * 100}%`
                }}
              />
            </div>
            <span className="preview-progress__label">
              {visibleLines.length === TERMINAL_LINES.length
                ? '✔ Deployment complete'
                : `Step ${visibleLines.length} / ${TERMINAL_LINES.length}`
              }
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}