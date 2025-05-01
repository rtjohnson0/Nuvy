import React, { useEffect, useRef } from 'react';

const featureData = [
  {
    icon: '🚀',
    title: 'Instant Deployments',
    desc: 'See your site live in under 30 seconds with our preconfigured pipeline.'
  },
  {
    icon: '🎨',
    title: 'Modern Interface',
    desc: 'Enjoy a sleek dark-mode UI with intuitive icons and animations.'
  },
  {
    icon: '⚙️',
    title: 'Mock AWS Integration',
    desc: 'Easily switch from simulated to real AWS services when you’re ready.'
  }
];

export default function Features() {
  const containerRef = useRef(null);

  useEffect(() => {
    const features = containerRef.current.querySelectorAll('.feature');
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    features.forEach(feature => observer.observe(feature));

    // Cleanup
    return () => observer.disconnect();
  }, []);

  return (
    <section className="features" id="features" ref={containerRef}>
      {featureData.map((feature, idx) => (
        <div key={idx} className="feature">
          <div className="feature-icon">{feature.icon}</div>
          <h3>{feature.title}</h3>
          <p>{feature.desc}</p>
        </div>
      ))}
    </section>
  );
}
