import React from 'react';
import { useDeployments } from '../hooks/useDeployments';
import '../styles/deployments.css';

export default function Deployments() {
  const { deploys, page, setPage, pageSize, total, filter, setFilter } = useDeployments();
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="deploy-container">
      <h1>Deployment History</h1>

      <div className="deploy-filters">
        <input
          type="text"
          placeholder="Filter by project..."
          value={filter.term}
          onChange={e => setFilter(prev => ({ ...prev, term: e.target.value }))}
        />
        <select
          value={filter.status}
          onChange={e => setFilter(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="Success">Success</option>
          <option value="Failed">Failed</option>
          <option value="InProgress">In Progress</option>
        </select>
        <input
          type="date"
          value={filter.date}
          onChange={e => setFilter(prev => ({ ...prev, date: e.target.value }))}
        />
      </div>

      <table className="deploy-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Date</th>
            <th>Time</th>
            <th>Trigger</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {deploys.map(d => (
            <tr key={d.id}>
              <td>{d.project}</td>
              <td>{d.date}</td>
              <td>{d.time}</td>
              <td>{d.trigger}</td>
              <td className={d.status.toLowerCase()}>{d.status}</td>
              <td><button className="log-btn">View Logs</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="deploy-pagination">
        <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>Prev</button>
        <span>{page} / {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>Next</button>
      </div>
    </div>
  );
}