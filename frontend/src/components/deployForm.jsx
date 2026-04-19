import React, { useState } from 'react';
import { createProjectAndDeploy } from '../utils/api';

export default function DeployForm({ onDeploymentCreated }) {
  const [zipFile, setZipFile] = useState(null);
  const [fileName, setFileName] = useState('No file chosen');
  const [repoURL, setRepoURL] = useState('');
  const [siteType, setSiteType] = useState('react');
  const [customDomain, setCustomDomain] = useState('');
  const [projectName, setProjectName] = useState('');
  const [progress, setProgress] = useState(0);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = e => {
    const file = e.target.files[0];
    if (file) {
      setZipFile(file);
      setFileName(file.name);
      setError('');
    }
  };

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    resetMessages();

    const hasZip = !!zipFile;
    const hasRepo = repoURL.trim().length > 0;

    if (!projectName.trim()) {
      setError('Project name is required.');
      return;
    }

    if (!hasZip && !hasRepo) {
      setError('Upload a ZIP file or enter a GitHub repository URL.');
      return;
    }

    if (hasZip && hasRepo) {
      setError('Choose either a ZIP file or a GitHub repository, not both.');
      return;
    }

    setDeploying(true);

    try {
      setProgress(15);

      const result = await createProjectAndDeploy({
        name: projectName.trim(),
        siteType,
        customDomain: customDomain.trim(),
        zipFile,
        repoURL: repoURL.trim()
      });

      setProgress(100);
      setSuccess(
        `Deployment created for ${result.project.name}. Initial status: ${result.deployment.status}. Live URL: ${result.deployment.url}`
      );

      if (onDeploymentCreated) {
        onDeploymentCreated(result);
      }

      setProjectName('');
      setRepoURL('');
      setCustomDomain('');
      setZipFile(null);
      setFileName('No file chosen');
      setSiteType('react');
    } catch (err) {
      setError(err.message || 'Something went wrong while deploying.');
    } finally {
      setTimeout(() => setProgress(0), 700);
      setDeploying(false);
    }
  };

  return (
    <div className="form-card" id="deploy-form">
      <div className="section-head">
        <h2>Launch a new project</h2>
        <p>Deploy a static site or React build through Nuvy.</p>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Project Name"
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          disabled={deploying}
        />

        <label htmlFor="zipUpload" className="upload-label">
          📁 Drag & Drop or Click to Upload ZIP
        </label>

        <input
          id="zipUpload"
          name="zip"
          type="file"
          accept=".zip"
          onChange={handleFileChange}
        />

        <div className="file-name">{fileName}</div>

        <div className="or-divider">
          <span>OR</span>
        </div>

        <input
          type="text"
          placeholder="GitHub Repository URL"
          value={repoURL}
          onChange={e => {
            setRepoURL(e.target.value);
            setError('');
          }}
          disabled={deploying || !!zipFile}
        />

        <select
          disabled={deploying}
          value={siteType}
          onChange={e => setSiteType(e.target.value)}
        >
          <option value="static">Static</option>
          <option value="react">React</option>
        </select>

        <input
          type="text"
          placeholder="Custom Domain (optional)"
          value={customDomain}
          onChange={e => setCustomDomain(e.target.value)}
          disabled={deploying}
        />

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        <button type="submit" className="btn" disabled={deploying}>
          {deploying ? 'Creating Deployment…' : 'Deploy Now'}
        </button>

        <div className="progress" style={{ opacity: progress ? 1 : 0 }}>
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </form>
    </div>
  );
}