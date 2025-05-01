export default function Hero({ onGetStarted }) {
    return (
      <section className="hero">
        <div className="hero-content">
          <h1>Deploy your web apps instantly</h1>
          <p>No configs…</p>
          <button className="cta" onClick={onGetStarted}>Get Started</button>
          <div className="helper">Try uploading…</div>
        </div>
      </section>
    );
  }
  