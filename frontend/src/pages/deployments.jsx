import React, { useMemo, useState } from 'react';
import { useDeployments } from '../hooks/useDeployments';
import { getDeploymentLog } from '../utils/api';

export default function Deployments() {
  const { deploys, page, setPage, pageSize, total, filter, setFilter } = useDeployments();
  const [logPanelOpen, setLogPanelOpen] = useState(false);
  const [logTitle, setLogTitle] = useState('');
  const [logOutput, setLogOutput] = useState('');

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const openLogs = async deploy => {
    const logs = await getDeploymentLog(deploy.id);
    setLogTitle(`${deploy.project} · ${deploy.id}`);
    setLogOutput(logs.join('\n'));
    setLogPanelOpen(true);
  };

  return (
    <section className="dashboard deploy-page">
      <div className="dashboard-header">
        <h1>Deployments</h1>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search deployments"
          value={filter.term}
          onChange={e => {
            setPage(1);
            setFilter(prev => ({ ...prev, term: e.target.value }));
          }}
        />

        <select
          value={filter.status}
          onChange={e => {
            setPage(1);
            setFilter(prev => ({ ...prev, status: e.target.value }));
          }}
        >
          <option value="">All statuses</option>
          <option value="Live">Live</option>
          <option value="Deploying">Deploying</option>
          <option value="Error">Error</option>
        </select>

        <input
          type="date"
          value={filter.date}
          onChange={e => {
            setPage(1);
            setFilter(prev => ({ ...prev, date: e.target.value }));
          }}
        />
      </div>

      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Status</th>
            <th>Date</th>
            <th>URL</th>
            <th>Logs</th>
          </tr>
        </thead>
        <tbody>
          {deploys.map(deploy => (
            <tr key={deploy.id}>
              <td>{deploy.project}</td>
              <td>
                <span className={`status ${deploy.status}`}>{deploy.status}</span>
              </td>
              <td>{deploy.dateLabel}</td>
              <td>
                <a href={deploy.url} target="_blank" rel="noreferrer">
                  Open
                </a>
              </td>
              <td>
                <button className="logBtn" onClick={() => openLogs(deploy)}>
                  View Logs
                </button>
              </td>
            </tr>
          ))}

          {!deploys.length && (
            <tr>
              <td colSpan="5">No deployments found.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="pagination">
        <button onClick={() => setPage(prev => prev - 1)} disabled={page <= 1}>
          Prev
        </button>
        <button disabled>
          Page {page} / {totalPages}
        </button>
        <button onClick={() => setPage(prev => prev + 1)} disabled={page >= totalPages}>
          Next
        </button>
      </div>

      <div id="logPanel" className={logPanelOpen ? 'open' : ''}>
        <button className="closeBtn" onClick={() => setLogPanelOpen(false)}>✕</button>
        <h2>{logTitle || 'Deployment Logs'}</h2>
        <div id="logOutput">{logOutput}</div>
      </div>
    </section>
  );
}