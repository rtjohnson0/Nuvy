const PROJECTS_KEY = 'nuvy-projects';
const DEPLOYMENTS_KEY = 'nuvy-deployments';

const seedProjects = [
  {
    id: 'proj_1',
    name: 'FinePoint Landing',
    status: 'Live',
    type: 'React',
    source: 'ZIP Upload',
    url: 'https://nuvy.app/p/finepoint-landing',
    updated: '2026-04-18T08:45:00.000Z'
  },
  {
    id: 'proj_2',
    name: 'Nuvy Marketing',
    status: 'Deploying',
    type: 'Static',
    source: 'GitHub Repo',
    url: 'https://nuvy.app/p/nuvy-marketing',
    updated: '2026-04-18T09:15:00.000Z'
  },
  {
    id: 'proj_3',
    name: 'Portfolio V3',
    status: 'Error',
    type: 'React',
    source: 'ZIP Upload',
    url: 'https://nuvy.app/p/portfolio-v3',
    updated: '2026-04-17T23:30:00.000Z'
  }
];

const seedDeployments = [
  {
    id: 'dep_1',
    projectId: 'proj_1',
    project: 'FinePoint Landing',
    status: 'Live',
    date: '2026-04-18T08:45:00.000Z',
    url: 'https://nuvy.app/p/finepoint-landing',
    logs: [
      'Uploading artifact...',
      'Validating index.html...',
      'Pushing files to static host...',
      'Deployment successful.'
    ]
  },
  {
    id: 'dep_2',
    projectId: 'proj_2',
    project: 'Nuvy Marketing',
    status: 'Deploying',
    date: '2026-04-18T09:15:00.000Z',
    url: 'https://nuvy.app/p/nuvy-marketing',
    logs: [
      'Fetching repository...',
      'Preparing deployment environment...',
      'Deployment in progress...'
    ]
  },
  {
    id: 'dep_3',
    projectId: 'proj_3',
    project: 'Portfolio V3',
    status: 'Error',
    date: '2026-04-17T23:30:00.000Z',
    url: 'https://nuvy.app/p/portfolio-v3',
    logs: [
      'Uploading artifact...',
      'Build validation failed.',
      'No index.html found in root output.'
    ]
  }
];

function ensureSeedData() {
  if (!localStorage.getItem(PROJECTS_KEY)) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(seedProjects));
  }
  if (!localStorage.getItem(DEPLOYMENTS_KEY)) {
    localStorage.setItem(DEPLOYMENTS_KEY, JSON.stringify(seedDeployments));
  }
}

function getProjectsRaw() {
  ensureSeedData();
  return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
}

function getDeploymentsRaw() {
  ensureSeedData();
  return JSON.parse(localStorage.getItem(DEPLOYMENTS_KEY) || '[]');
}

function saveProjects(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function saveDeployments(deployments) {
  localStorage.setItem(DEPLOYMENTS_KEY, JSON.stringify(deployments));
}

function formatRelative(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function fetchProjects() {
  await delay(150);
  return getProjectsRaw()
    .map(project => ({
      ...project,
      updatedLabel: formatRelative(project.updated)
    }))
    .sort((a, b) => new Date(b.updated) - new Date(a.updated));
}

export async function fetchDeployments() {
  await delay(150);
  return getDeploymentsRaw()
    .map(deployment => ({
      ...deployment,
      dateLabel: formatRelative(deployment.date)
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getDeploymentLog(deploymentId) {
  await delay(120);
  const deployments = getDeploymentsRaw();
  const found = deployments.find(item => item.id === deploymentId);
  return found?.logs || ['No logs found.'];
}

export async function createProjectAndDeploy({
  name,
  siteType,
  customDomain,
  zipFile,
  repoURL
}) {
  await delay(500);

  const projects = getProjectsRaw();
  const deployments = getDeploymentsRaw();

  const projectId = `proj_${Date.now()}`;
  const deploymentId = `dep_${Date.now()}`;
  const slug = slugify(name);
  const source = zipFile ? 'ZIP Upload' : 'GitHub Repo';
  const type = siteType === 'react' ? 'React' : 'Static';
  const now = new Date().toISOString();
  const url = customDomain
    ? `https://${customDomain}`
    : `https://nuvy.app/p/${slug}`;

  const project = {
    id: projectId,
    name,
    status: 'Live',
    type,
    source,
    url,
    updated: now
  };

  const deployment = {
    id: deploymentId,
    projectId,
    project: name,
    status: 'Live',
    date: now,
    url,
    logs: [
      source === 'ZIP Upload' ? 'Uploading ZIP artifact...' : 'Fetching GitHub repository...',
      `Detected project type: ${type}`,
      'Validating deployment payload...',
      'Publishing build output...',
      'Deployment successful.'
    ]
  };

  projects.unshift(project);
  deployments.unshift(deployment);

  saveProjects(projects);
  saveDeployments(deployments);

  return { project, deployment };
}