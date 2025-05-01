import React, { useState } from 'react';
import { uploadZip, deployProject } from '../utils/api';

export default function DeployForm() {
  const [zipFile, setZipFile] = useState(null);
  const [fileName, setFileName] = useState('No file chosen');
  const [zipError, setZipError] = useState('');
  const [repoURL, setRepoURL] = useState('');
  const [repoError, setRepoError] = useState('');
  const [progress, setProgress] = useState(0);
  const [deploying, setDeploying] = useState(false);

  const handleFileChange = e => {
    const file = e.target.files[0];
    if (file) {
      setZipFile(file);
      setFileName(file.name);
      setZipError('');
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    let valid = true;
    setZipError('');
    setRepoError('');

    if (!zipFile) { setZipError('Please upload a ZIP file.'); valid = false; }
    if (!repoURL) { setRepoError('Repository URL is required.'); valid = false; }
    if (!valid) return;

    setDeploying(true);
    try {
      setProgress(10);
      const projectId = await uploadZip(zipFile);
      setProgress(50);
      const result = await deployProject(projectId);
      setProgress(100);
      alert('✅ Deployment simulated!\n' + result.log);
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      setTimeout(() => setProgress(0), 500);
      setDeploying(false);
    }
  };

  return (
    <div className="form-card">
      <form className="form" onSubmit={handleSubmit}>
        <label htmlFor="zipUpload" className="upload-label">
          📁 Drag & Drop or Click to Upload ZIP
        </label>
        <input
          id="zipUpload"
          type="file"
          accept=".zip"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <div className="file-name">{fileName}</div>
        {zipError && <div className="error-msg">{zipError}</div>}

        <input
          type="text"
          placeholder="GitHub Repository URL"
          value={repoURL}
          onChange={e => { setRepoURL(e.target.value); setRepoError(''); }}
        />
        {repoError && <div className="error-msg">{repoError}</div>}

        <select disabled={deploying} defaultValue="">
          <option value="" disabled>Select site type (optional)</option>
          <option value="static">Static</option>
          <option value="react">React</option>
        </select>

        <input
          type="text"
          placeholder="Custom Domain (optional)"
          disabled={deploying}
        />

        <button type="submit" className="btn" disabled={deploying}>
          {deploying ? 'Deploying…' : 'Deploy Now'}
        </button>

        <div className="progress" style={{ opacity: progress ? 1 : 0 }}>
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </form>
    </div>
  );
}