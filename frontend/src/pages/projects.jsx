import React from 'react';
import { useProjects } from '../hooks/useProjects';

const STATUS_COLORS = {
  Live:       '#30c48d',
  Error:      '#ff6b6b',
  Deploying:  '#ffc107',
  Building:   '#a855f7',
  Cloning:    '#3b82f6',
  Uploading:  '#0ea5e9',
  Extracting: '#8b5cf6',
  Validating: '#06b6d4',
  Preparing:  '#6366f1',
  Queued:     '#64748b',
};

function StatusDot({ status }) {
  const color = STATUS_COLORS[status] || '#64748b';
  return (
    <span className="status-dot-wrap" style={{ color }}>
      <span className="status-dot" style={{ background: color }} />
      {status}
    </span>
  );
}

export default function Projects() {
  const {
    projects, filter, setFilter, sortBy,
    viewMode, setViewMode, favs, toggleFav,
    detail, openDetail, closeDetail, loading,
  } = useProjects();

  return (
    <section className="projects-page">
      <div className="dashboard-header">
        <h1>Projects</h1>
        <input
          type="text"
          placeholder="Search projects"
          value={filter.term}
          onChange={e => setFilter({ term: e.target.value })}
        />
      </div>

      <div className="filter-bar">
        <select value={filter.status} onChange={e => setFilter({ status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="Queued">Queued</option>
          <option value="Uploading">Uploading</option>
          <option value="Cloning">Cloning</option>
          <option value="Building">Building</option>
          <option value="Deploying">Deploying</option>
          <option value="Live">Live</option>
          <option value="Error">Error</option>
        </select>
        <input type="date" value={filter.from} onChange={e => setFilter({ from: e.target.value })} />
        <input type="date" value={filter.to}   onChange={e => setFilter({ to:   e.target.value })} />
      </div>

      <div className="view-toggle">
        <button className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')}>Cards</button>
        <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>Table</button>
      </div>

      {loading ? (
        <div className="empty-state"><h3>Loading projects...</h3></div>
      ) : !projects.length ? (
        <div className="empty-state">
          <div className="empty-state__icon">🚀</div>
          <h3>No projects yet</h3>
          <p>Deploy your first project through Nuvy to see it here.</p>
          <a href="/" className="btn empty-state__btn">Deploy a project →</a>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="projects-grid">
          {projects.map(project => (
            <div key={project.id} className={`project-card project-card--${(project.status || '').toLowerCase()}`}>
              <button
                className={`star-btn ${favs.has(project.id) ? 'fav' : ''}`}
                onClick={() => toggleFav(project.id)}
                title="Favorite"
              >★</button>

              <div className="project-card__top">
                <div className="project-thumb">{project.name.slice(0, 2).toUpperCase()}</div>
                <div className="project-card__info">
                  <h3 className="project-card__name">{project.name}</h3>
                  <div className="project-card__meta">{project.type} · {project.source}</div>
                </div>
              </div>

              <StatusDot status={project.status} />

              {project.url && project.status === 'Live' && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-card__url"
                  onClick={e => e.stopPropagation()}
                >
                  {project.url.replace('https://', '')} ↗
                </a>
              )}

              {project.latestLogLine && project.status !== 'Live' && (
                <div className="latest-log-preview">{project.latestLogLine}</div>
              )}

              <div className="project-card__updated">Updated {project.updatedLabel}</div>

              <div className="actions actions-stack">
                <button onClick={() => openDetail(project)}>Details</button>
                {project.url && (
                  <button
                    className="secondary-btn"
                    onClick={() => window.open(project.url, '_blank', 'noopener,noreferrer')}
                  >
                    Open Site ↗
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Deploy new slot */}
          <a href="/" className="project-card project-card--new">
            <div className="project-card--new__inner">
              <div className="project-card--new__plus">+</div>
              <div className="project-card--new__label">Deploy new project</div>
            </div>
          </a>
        </div>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th onClick={() => sortBy('name')}>Name</th>
              <th onClick={() => sortBy('status')}>Status</th>
              <th onClick={() => sortBy('updated')}>Updated</th>
              <th>Deployments</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(project => (
              <tr key={project.id}>
                <td>{project.name}</td>
                <td><StatusDot status={project.status} /></td>
                <td>{project.updatedLabel}</td>
                <td>{project.deploymentCount}</td>
                <td>
                  {project.url
                    ? <a href={project.url} target="_blank" rel="noreferrer">Open ↗</a>
                    : <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Detail panel */}
      <div className={`detail-panel ${detail ? 'open' : ''}`}>
        {detail && (
          <>
            <button className="closeBtn" onClick={closeDetail}>✕</button>
            <h2>{detail.name}</h2>
            <p><strong>Status:</strong> <StatusDot status={detail.status} /></p>
            <p><strong>Type:</strong> {detail.type}</p>
            <p><strong>Source:</strong> {detail.source}</p>
            <p><strong>Updated:</strong> {detail.updatedLabel}</p>
            <p><strong>Deployments:</strong> {detail.deploymentCount}</p>
            {detail.uploadedFile   && <p><strong>File:</strong> {detail.uploadedFile}</p>}
            {detail.latestLogLine  && <p><strong>Latest:</strong> <span className="mono-text">{detail.latestLogLine}</span></p>}
            {detail.url && (
              <p>
                <strong>Live URL:</strong>{' '}
                <a href={detail.url} target="_blank" rel="noreferrer">{detail.url}</a>
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}