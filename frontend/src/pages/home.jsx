import React from 'react';
import Hero from '../components/hero';
import Features from '../components/features';
import DeployForm from '../components/deployForm';

export default function Home() {
  const scrollToForm = () => {
    const el = document.getElementById('deploy-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDeploymentCreated = () => {
    window.dispatchEvent(new Event('nuvy:deployment-created'));
  };

  return (
    <>
      <Hero onGetStarted={scrollToForm} />
      <Features />
      <DeployForm onDeploymentCreated={handleDeploymentCreated} />
    </>
  );
}