import React from 'react';
import { useProjects } from '../hooks/useProjects';
import '../styles/projects.css';

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
    closeDetail,
  } = useProjects();

  return (
    <div className="projects-page container">
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search name/status…"
          value={filter.term}
          onChange={e => setFilter({ term: e.target.value })}
        />
        <select
          value={filter.status}
          onChange={e => setFilter({ status: e.target.value })}
        >
          <option value="">All Statuses</option>
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
        >📦 Cards</button>
        <button
          className={viewMode === 'table' ? 'active' : ''}
          onClick={() => setViewMode('table')}
        >📋 Table</button>
      </div>

      {viewMode === 'cards' ? (
        <div className="projects-grid">
          {projects.map(p => (
            <div key={p.id} className="project-card">
              <button
                className={`star-btn ${favs.has(p.id) ? 'fav' : ''}`}
                onClick={() => toggleFav(p.id)}
              >{favs.has(p.id) ? '★' : '☆'}</button>

              <div className="project-thumb">
                {p.name.split(' ').map(w => w[0]).join('').toUpperCase()}
              </div>
              <h3>{p.name}</h3>
              <span className={`status ${p.status}`}>{p.status}</span>
              <p className="updated">Last updated {p.updated}</p>
              <div className="actions">
                <button onClick={() => openDetail(p)}>View</button>
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
              <th onClick={() => sortBy('updated')}>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id} onClick={() => openDetail(p)}>
                <td>{p.name}</td>
                <td>{p.status}</td>
                <td>{p.updated}</td>
                <td><button>Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {detail && (
        <aside className="detail-panel open">
          <button className="closeBtn" onClick={closeDetail}>✕</button>
          <h3>{detail.name}</h3>
          <p><strong>Status:</strong> {detail.status}</p>
          <p><strong>Last Updated:</strong> {detail.updated}</p>
        </aside>
      )}
    </div>
  );
}
