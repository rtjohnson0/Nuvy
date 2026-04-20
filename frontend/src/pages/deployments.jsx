import React, { useEffect, useMemo, useState } from 'react';
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
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [logTitle, setLogTitle] = useState('');
  const [logOutput, setLogOutput] = useState('');
  const [logStatus, setLogStatus] = useState('');

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const openLogs = async deploy => {
    setSelectedDeployment(deploy);
    setLogTitle(`${deploy.project} · ${deploy.id}`);
    setLogPanelOpen(true);

    try {
      const data = await getDeploymentLog(deploy.id);
      setLogOutput((data.logs || []).join('\n'));
      setLogStatus(data.status || deploy.status);
    } catch (err) {
      setLogOutput('Failed to load logs.');
      setLogStatus('Error');
    }
  };

  const closeLogs = () => {
    setLogPanelOpen(false);
    setSelectedDeployment(null);
    setLogTitle('');
    setLogOutput('');
    setLogStatus('');
  };

  useEffect(() => {
    if (!logPanelOpen || !selectedDeployment) return;

    const poll = async () => {
      try {
        const data = await getDeploymentLog(selectedDeployment.id);
        setLogOutput((data.logs || []).join('\n'));
        setLogStatus(data.status || '');
      } catch {
        // ignore polling errors for now
      }
    };

    poll();
    const interval = setInterval(poll, 2000);

    return () => clearInterval(interval);
  }, [logPanelOpen, selectedDeployment]);

  return (
    <section className="dashboard deploy-page">
      <div className="dashboard-header">
        <div>
          <h1>Deployments</h1>
          <div className="autoRefreshText">Auto-refreshing deployment data</div>
        </div>
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
          <option value="Queued">Queued</option>
          <option value="Uploading">Uploading</option>
          <option value="Extracting">Extracting</option>
          <option value="Validating">Validating</option>
          <option value="Preparing">Preparing</option>
          <option value="Uploading to S3">Uploading to S3</option>
          <option value="Cloning">Cloning</option>
          <option value="Building">Building</option>
          <option value="Deploying">Deploying</option>
          <option value="Live">Live</option>
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
                  <span className={`status ${statusClassName(deploy.status)}`}>{deploy.status}</span>
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
            {logStatus && (
              <div className="logStatusRow">
                <span className={`status ${statusClassName(logStatus)}`}>{logStatus}</span>
              </div>
            )}
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

function statusClassName(status) {
  return String(status || '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}