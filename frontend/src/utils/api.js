const API_BASE = process.env.REACT_APP_API_URL || '';

export async function uploadZip(file) {
  const formData = new FormData();
  formData.append('zip', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  const projectId = await res.text();
  return projectId;
}

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