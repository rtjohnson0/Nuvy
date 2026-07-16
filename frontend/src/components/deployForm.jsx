import React, { useState } from 'react';
import { createProjectAndDeploy } from '../utils/api';

const STEPS = ['Name', 'Source', 'Type', 'Deploy'];

export default function DeployForm({ onDeploymentCreated }) {
  const [zipFile,      setZipFile]      = useState(null);
  const [fileName,     setFileName]     = useState('');
  const [repoURL,      setRepoURL]      = useState('');
  const [siteType,     setSiteType]     = useState('static');
  const [projectName,  setProjectName]  = useState('');
  const [deploying,    setDeploying]    = useState(false);
  const [error,        setError]        = useState('');
  const [result,       setResult]       = useState(null);
  const [sourceTab,    setSourceTab]    = useState('zip'); // 'zip' | 'repo'
  const [activeStep,   setActiveStep]   = useState(0);

  const handleFileChange = e => {
    const file = e.target.files[0];
    if (file) {
      setZipFile(file);
      setFileName(file.name);
      setError('');
      setActiveStep(1);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!projectName.trim()) { setError('Project name is required.'); return; }
    if (sourceTab === 'zip'  && !zipFile)          { setError('Upload a ZIP file.'); return; }
    if (sourceTab === 'repo' && !repoURL.trim())   { setError('Enter a GitHub repository URL.'); return; }

    setDeploying(true);
    setActiveStep(3);

    try {
      const data = await createProjectAndDeploy({
        name:    projectName.trim(),
        siteType,
        zipFile: sourceTab === 'zip' ? zipFile : null,
        repoURL: sourceTab === 'repo' ? repoURL.trim() : '',
      });
      setResult(data);
      if (onDeploymentCreated) onDeploymentCreated(data);
    } catch (err) {
      setError(err.message || 'Something went wrong while deploying.');
      setActiveStep(2);
    } finally {
      setDeploying(false);
    }
  };

  const reset = () => {
    setResult(null); setError(''); setProjectName(''); setRepoURL('');
    setZipFile(null); setFileName(''); setSiteType('static');
    setSourceTab('zip'); setActiveStep(0);
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (result) {
    const url = result.deployment?.url || result.project?.url || '';
    return (
      <div className="form-card deploy-success">
        <div className="deploy-success__icon">🚀</div>
        <h2 className="deploy-success__title">Deployment started!</h2>
        <p className="deploy-success__sub">
          <strong>{result.project?.name}</strong> is being deployed to GitHub Pages.
          Check the Deployments tab for live logs.
        </p>
        {url && (
          <div className="deploy-success__url-wrap">
            <span className="deploy-success__url-label">Live URL (available in ~60s)</span>
            <a href={url} target="_blank" rel="noopener noreferrer" className="deploy-success__url">
              {url} ↗
            </a>
          </div>
        )}
        <div className="deploy-success__actions">
          <a href="/deployments" className="btn">View logs</a>
          <button className="btn btn--ghost" onClick={reset}>Deploy another</button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="form-card" id="deploy-form">
      <div className="section-head">
        <h2>Launch a new project</h2>
        <p>Deploy a static site or React build through Nuvy.</p>
      </div>

      {/* Step tracker */}
      <div className="deploy-steps">
        {STEPS.map((label, i) => (
          <div key={label} className={`deploy-step ${i <= activeStep ? 'deploy-step--active' : ''}`}>
            <div className="deploy-step__num">{i < activeStep ? '✓' : i + 1}</div>
            <span className="deploy-step__label">{label}</span>
            {i < STEPS.length - 1 && <div className="deploy-step__line" />}
          </div>
        ))}
      </div>

      <form className="form" onSubmit={handleSubmit}>

        {/* Project name */}
        <div className="deploy-field">
          <label className="deploy-label">Project name</label>
          <input
            type="text"
            placeholder="my-portfolio"
            value={projectName}
            onChange={e => { setProjectName(e.target.value); setActiveStep(e.target.value ? 1 : 0); }}
            disabled={deploying}
          />
        </div>

        {/* Source tabs */}
        <div className="deploy-field">
          <label className="deploy-label">Source</label>
          <div className="source-tabs">
            <button
              type="button"
              className={`source-tab ${sourceTab === 'zip' ? 'source-tab--active' : ''}`}
              onClick={() => { setSourceTab('zip'); setRepoURL(''); setActiveStep(projectName ? 1 : 0); }}
            >
              📁 ZIP Upload
            </button>
            <button
              type="button"
              className={`source-tab ${sourceTab === 'repo' ? 'source-tab--active' : ''}`}
              onClick={() => { setSourceTab('repo'); setZipFile(null); setFileName(''); setActiveStep(projectName ? 1 : 0); }}
            >
              🐙 GitHub Repo
            </button>
          </div>

          {sourceTab === 'zip' ? (
            <div className="upload-zone" onClick={() => document.getElementById('zipUpload').click()}>
              {fileName ? (
                <span className="upload-zone__file">📄 {fileName}</span>
              ) : (
                <span className="upload-zone__hint">Drop ZIP here or click to browse</span>
              )}
              <input
                id="zipUpload" type="file" accept=".zip" style={{ display: 'none' }}
                onChange={e => { handleFileChange(e); setActiveStep(2); }}
              />
            </div>
          ) : (
            <input
              type="text"
              placeholder="https://github.com/username/repo"
              value={repoURL}
              onChange={e => { setRepoURL(e.target.value); if (e.target.value) setActiveStep(2); }}
              disabled={deploying}
            />
          )}
        </div>

        {/* Site type toggle */}
        <div className="deploy-field">
          <label className="deploy-label">Project type</label>
          <div className="type-toggle">
            <button
              type="button"
              className={`type-btn ${siteType === 'static' ? 'type-btn--active' : ''}`}
              onClick={() => { setSiteType('static'); setActiveStep(Math.max(activeStep, 2)); }}
            >
              📄 Static
            </button>
            <button
              type="button"
              className={`type-btn ${siteType === 'react' ? 'type-btn--active' : ''}`}
              onClick={() => { setSiteType('react'); setActiveStep(Math.max(activeStep, 2)); }}
            >
              ⚛️ React
            </button>
          </div>
          <p className="deploy-hint">
            {siteType === 'static'
              ? 'Plain HTML/CSS/JS — deployed as-is.'
              : 'Upload your build/ folder as a ZIP, or let Nuvy run npm build for you.'}
          </p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button
          type="submit"
          className="btn"
          disabled={deploying}
          onClick={() => setActiveStep(3)}
        >
          {deploying ? (
            <span className="deploy-spinner">⏳ Deploying…</span>
          ) : (
            '🚀 Deploy to GitHub Pages'
          )}
        </button>
      </form>
    </div>
  );
}