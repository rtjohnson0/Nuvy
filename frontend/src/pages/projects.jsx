import React from 'react';
import { useProjects } from '../hooks/useProjects';

export default function Projects() {
  const {
    projects,
    filter,
    setFilter,
    sortBy,
    viewMode,
    setViewMode,
    favs,
    toggleFav,
    detail,
    openDetail,
    closeDetail
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
        <select
          value={filter.status}
          onChange={e => setFilter({ status: e.target.value })}
        >
          <option value="">All statuses</option>
          <option value="Live">Live</option>
          <option value="Deploying">Deploying</option>
          <option value="Error">Error</option>
        </select>

        <input
          type="date"
          value={filter.from}
          onChange={e => setFilter({ from: e.target.value })}
        />

        <input
          type="date"
          value={filter.to}
          onChange={e => setFilter({ to: e.target.value })}
        />
      </div>

      <div className="view-toggle">
        <button
          className={viewMode === 'cards' ? 'active' : ''}
          onClick={() => setViewMode('cards')}
        >
          Cards
        </button>
        <button
          className={viewMode === 'table' ? 'active' : ''}
          onClick={() => setViewMode('table')}
        >
          Table
        </button>
      </div>

      {viewMode === 'cards' ? (
        <div className="projects-grid">
          {projects.map(project => (
            <div key={project.id} className="project-card">
              <button
                className={`star-btn ${favs.has(project.id) ? 'fav' : ''}`}
                onClick={() => toggleFav(project.id)}
                title="Favorite project"
              >
                ★
              </button>

              <div className="project-thumb">{project.name.slice(0, 2).toUpperCase()}</div>
              <h3>{project.name}</h3>
              <div className={`status ${project.status}`}>{project.status}</div>
              <div className="updated">Updated {project.updatedLabel}</div>

              <div className="actions">
                <button onClick={() => openDetail(project)}>View Details</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th onClick={() => sortBy('name')}>Name</th>
              <th onClick={() => sortBy('status')}>Status</th>
              <th onClick={() => sortBy('updated')}>Updated</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(project => (
              <tr key={project.id}>
                <td>{project.name}</td>
                <td>
                  <span className={`status ${project.status}`}>{project.status}</span>
                </td>
                <td>{project.updatedLabel}</td>
                <td>
                  <a href={project.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={`detail-panel ${detail ? 'open' : ''}`}>
        {detail && (
          <>
            <button className="closeBtn" onClick={closeDetail}>✕</button>
            <h2>{detail.name}</h2>
            <p><strong>Status:</strong> {detail.status}</p>
            <p><strong>Type:</strong> {detail.type}</p>
            <p><strong>Updated:</strong> {detail.updatedLabel}</p>
            <p><strong>Source:</strong> {detail.source}</p>
            <p>
              <strong>Live URL:</strong>{' '}
              <a href={detail.url} target="_blank" rel="noreferrer">
                {detail.url}
              </a>
            </p>
          </>
        )}
      </div>
    </section>
  );
}