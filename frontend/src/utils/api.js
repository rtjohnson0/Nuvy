const API_BASE = 'http://localhost:8080/api';

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export async function fetchProjects() {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error('Failed to fetch projects');

  const data = await res.json();
  return data.map(project => ({
    ...project,
    updatedLabel: project.updatedLabel || formatDate(project.updated)
  }));
}

export async function fetchDeployments() {
  const res = await fetch(`${API_BASE}/deployments`);
  if (!res.ok) throw new Error('Failed to fetch deployments');

  const data = await res.json();
  return data.map(deployment => ({
    ...deployment,
    dateLabel: deployment.dateLabel || formatDate(deployment.date)
  }));
}

export async function getDeploymentLog(deploymentId) {
  const res = await fetch(`${API_BASE}/deployments/${deploymentId}/logs`);
  if (!res.ok) throw new Error('Failed to fetch deployment logs');

  const data = await res.json();
  return data.logs || [];
}

export async function createProjectAndDeploy({
  name,
  siteType,
  customDomain,
  zipFile,
  repoURL
}) {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('siteType', siteType);
  formData.append('customDomain', customDomain || '');
  formData.append('repoURL', repoURL || '');

  if (zipFile) {
    formData.append('zipFile', zipFile);
  }

  const res = await fetch(`${API_BASE}/projects/deploy`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create deployment' }));
    throw new Error(err.error || 'Failed to create deployment');
  }

  return res.json();
}