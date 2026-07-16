import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useDeployments } from '../hooks/useDeployments';
import { getDeploymentLog } from '../utils/api';

function classifyLog(line) {
  const l = line.toLowerCase();
  if (l.startsWith('✔') || l.includes('success') || l.includes('live at'))   return 'ok';
  if (l.startsWith('✗') || l.includes('failed') || l.includes('error'))       return 'error';
  if (l.includes('npm') || l.includes('build') || l.includes('install'))      return 'warn';
  if (l.startsWith('[nuvy]') || l.includes('initialized'))                    return 'system';
  return 'info';
}

function LogLine({ line }) {
  return <div className={`log-line log-line--${classifyLog(line)}`}>{line}</div>;
}

function StatusDot({ status }) {
  const colors = {
    Live: '#30c48d', Error: '#ff6b6b', Deploying: '#ffc107',
    Building: '#a855f7', Cloning: '#3b82f6', Uploading: '#0ea5e9',
    Queued: '#64748b',
  };
  const color = colors[status] || '#64748b';
  return (
    <span className="status-dot-wrap" style={{ color }}>
      <span className="status-dot" style={{ background: color }} />
      {status}
    </span>
  );
}

export default function Deployments() {
  const { deploys, page, setPage, pageSize, total, filter, setFilter, loading } = useDeployments();

  const [logOpen,     setLogOpen]     = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [logLines,    setLogLines]    = useState([]);
  const [logStatus,   setLogStatus]   = useState('');
  const logEndRef = useRef(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const openLogs = async deploy => {
    setSelected(deploy);
    setLogLines([]);
    setLogStatus(deploy.status);
    setLogOpen(true);

    try {
      const data = await getDeploymentLog(deploy.id);
      setLogLines(data.logs || []);
      setLogStatus(data.status || deploy.status);
    } catch {
      setLogLines(['Failed to load logs.']);
    }
  };

  const closeLogs = () => {
    setLogOpen(false);
    setSelected(null);
    setLogLines([]);
    setLogStatus('');
  };

  // Poll logs while deployment is in progress
  useEffect(() => {
    if (!logOpen || !selected) return;
    const done = ['Live', 'Error'].includes(logStatus);
    if (done) return;

    const poll = async () => {
      try {
        const data = await getDeploymentLog(selected.id);
        setLogLines(data.logs || []);
        setLogStatus(data.status || '');
      } catch { /* ignore */ }
    };

    const iv = setInterval(poll, 2000);
    return () => clearInterval(iv);
  }, [logOpen, selected, logStatus]);

  // Auto-scroll to bottom on new log lines
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logLines]);

  return (
    <section className="dashboard deploy-page">
      <div className="dashboard-header">
        <div>
          <h1>Deployments</h1>
          <div className="autoRefreshText">Auto-refreshing every 2 seconds</div>
        </div>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search deployments"
          value={filter.term}
          onChange={e => { setPage(1); setFilter(p => ({ ...p, term: e.target.value })); }}
        />
        <select
          value={filter.status}
          onChange={e => { setPage(1); setFilter(p => ({ ...p, status: e.target.value })); }}
        >
          <option value="">All statuses</option>
          <option value="Queued">Queued</option>
          <option value="Uploading">Uploading</option>
          <option value="Cloning">Cloning</option>
          <option value="Building">Building</option>
          <option value="Deploying">Deploying</option>
          <option value="Live">Live</option>
          <option value="Error">Error</option>
        </select>
        <input
          type="date"
          value={filter.date}
          onChange={e => { setPage(1); setFilter(p => ({ ...p, date: e.target.value })); }}
        />
      </div>

      {loading ? (
        <div className="empty-state"><h3>Loading deployments...</h3></div>
      ) : !deploys.length ? (
        <div className="empty-state">
          <div className="empty-state__icon">📋</div>
          <h3>No deployments yet</h3>
          <p>Your deployment history will show up here once you launch a project.</p>
          <a href="/" className="btn empty-state__btn">Deploy your first project →</a>
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
                <td><StatusDot status={deploy.status} /></td>
                <td>{deploy.dateLabel}</td>
                <td>
                  {deploy.url
                    ? <button className="openSiteBtn" onClick={() => window.open(deploy.url, '_blank', 'noopener,noreferrer')}>Open ↗</button>
                    : <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                  }
                </td>
                <td>
                  <button className="logBtn" onClick={() => openLogs(deploy)}>View logs</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Prev</button>
        <button disabled>Page {page} / {totalPages}</button>
        <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</button>
      </div>

      {logOpen && <div className="logOverlay" onClick={closeLogs} />}

      <div id="logPanel" className={logOpen ? 'open' : ''}>
        <div className="logPanelHeader">
          <div>
            <h2>Deployment Logs</h2>
            {selected && <div className="logPanelSubtext">{selected.project} · {selected.id}</div>}
            {logStatus && <div className="logStatusRow"><StatusDot status={logStatus} /></div>}
          </div>
          <button className="logCloseBtn" onClick={closeLogs}>✕</button>
        </div>

        <div id="logOutput">
          {logLines.map((line, i) => <LogLine key={i} line={line} />)}
          {logStatus && !['Live','Error'].includes(logStatus) && (
            <div className="log-line log-line--system log-cursor">
              <span className="blinking-cursor" />
            </div>
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </section>
  );
}