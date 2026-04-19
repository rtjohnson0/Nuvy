import React, { useMemo, useState } from 'react';
import { useDeployments } from '../hooks/useDeployments';
import { getDeploymentLog } from '../utils/api';

export default function Deployments() {
  const {
    deploys,
    page,
    setPage,
    pageSize,
    total,
    filter,
    setFilter,
    loading
  } = useDeployments();

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

  const closeLogs = () => {
    setLogPanelOpen(false);
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

      {loading ? (
        <div className="empty-state">
          <h3>Loading deployments...</h3>
        </div>
      ) : !deploys.length ? (
        <div className="empty-state">
          <h3>No deployments yet</h3>
          <p>Your deployment history will show up here once you launch a project.</p>
        </div>
      ) : (
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
                  <button
                    className="openSiteBtn"
                    onClick={() => window.open(deploy.url, '_blank', 'noopener,noreferrer')}
                  >
                    Open Site ↗
                  </button>
                </td>
                <td>
                  <button className="logBtn" onClick={() => openLogs(deploy)}>
                    View Logs
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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

      {logPanelOpen && <div className="logOverlay" onClick={closeLogs} />}

      <div id="logPanel" className={logPanelOpen ? 'open' : ''}>
        <div className="logPanelHeader">
          <div>
            <h2>Deployment Logs</h2>
            <div className="logPanelSubtext">{logTitle}</div>
          </div>

          <button className="logCloseBtn" onClick={closeLogs} aria-label="Close logs panel">
            ✕
          </button>
        </div>

        <div id="logOutput">{logOutput}</div>
      </div>
    </section>
  );
}