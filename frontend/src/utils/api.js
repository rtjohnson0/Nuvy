const API_BASE = process.env.REACT_APP_API_URL || '';

/**
 * Fetch list of deployments for the history page
 */
export async function fetchDeployments() {
  const res = await fetch(`${API_BASE}/deployments`);
  if (!res.ok) throw new Error(`Fetch deployments failed: ${res.statusText}`);
  return await res.json();
}

/**
 * Upload a ZIP package to the backend
 */
export async function uploadZip(file) {
  const formData = new FormData();
  formData.append('zip', file);

  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return await res.text();
}

/**
 * Trigger a deployment for a given project ID
 */
export async function deployProject(projectId) {
  const res = await fetch(`${API_BASE}/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.log || 'Deploy failed');
  return data;
}