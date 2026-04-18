import React, { useEffect, useRef } from 'react';

const featureData = [
  {
    icon: '🚀',
    title: 'Fast Deployments',
    desc: 'Trigger deploys in seconds with a clean, platform-style flow.'
  },
  {
    icon: '📦',
    title: 'ZIP or GitHub',
    desc: 'Launch projects from a build artifact or a connected repository.'
  },
  {
    icon: '📊',
    title: 'Deployment Visibility',
    desc: 'Track status, logs, and project health from one dashboard.'
  }
];

export default function Features() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

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
      { threshold: 0.25 }
    );

    features.forEach(feature => observer.observe(feature));

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