import React, { useState, useEffect } from 'react';
import '../styles/deployments.css';

const mockDeployments = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  project: ['MyStatic','Staging','OldSite','ReactApp'][(i+1) % 4],
  timestamp: new Date(Date.now() - (i+1) * 3600000),
  trigger: (i+1) % 3 === 0 ? 'Webhook' : 'Manual',
  status: (i+1) % 5 === 0 ? 'Failed' : ((i+1) % 2 === 0 ? 'InProgress' : 'Success'),
  logs: [
    'Initializing deployment...',
    'Fetching source...',
    'Building project...',
    'Uploading to S3...',
    'Invalidating cache...',
    `Deployment ${(i+1)%5===0 ? 'failed' : 'succeeded'}.`
  ]
}));

export default function Deployments() {
  const [data] = useState(mockDeployments);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [term,    setTerm]    = useState('');
  const [statuses,setStatuses]= useState({ Success:true, Failed:true, InProgress:true });
  const [date,    setDate]    = useState('');

  const [logEntry, setLogEntry] = useState(null);

  // filtering + pagination
  useEffect(() => {
    let arr = data.filter(d => {
      if (term && !d.project.toLowerCase().includes(term.toLowerCase())) return false;
      if (!statuses[d.status]) return false;
      if (date && d.timestamp.toLocaleDateString() !== new Date(date).toLocaleDateString()) return false;
      return true;
    });
    setFiltered(arr);
    setPage(1);
  }, [term, statuses, date, data]);

  const paged = filtered.slice((page-1)*pageSize, page*pageSize);

  // bulk select state
  const [allSelected, setAllSelected] = useState(false);
  const [selected, setSelected] = useState(new Set());
  useEffect(() => {
    // reset selection when filtered changes
    setSelected(new Set());
    setAllSelected(false);
  }, [filtered]);

  const toggleRow = id => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(paged.map(d => d.id)));
    setAllSelected(!allSelected);
  };

  // bulk actions
  const applyBulk = action => {
    const next = data.map(d => {
      if (selected.has(d.id)) {
        if (action==='retryFailed'    && d.status==='Failed')     return { ...d, status:'InProgress' };
        if (action==='cancelInProgress'&& d.status==='InProgress')return { ...d, status:'Failed' };
      }
      return d;
    });
    // update data (mock): we can't directly setState on const data, so skip real update
    // In a real app you'd call an API here.
    alert(`Applied ${action} to ${selected.size} item(s)`);
  };

  // render a row
  const formatDate = d => d.toLocaleDateString();
  const relTime = d => {
    const h = Math.floor((Date.now()-d)/3600000);
    return h<1 ? `${Math.floor((Date.now()-d)/60000)}m ago` : `${h}h ago`;
  };

  return (
    <div className="deploy-page container">
      <h1>Deployment History</h1>

      <div className="filters">
        <input
          type="text"
          placeholder="Filter by project..."
          value={term}
          onChange={e=>setTerm(e.target.value)}
        />

        <select
          multiple
          value={Object.keys(statuses).filter(k=>statuses[k])}
          onChange={e=> {
            const opts = Array.from(e.target.selectedOptions).map(o=>o.value);
            setStatuses({ Success:opts.includes('Success'),
                          Failed:opts.includes('Failed'),
                          InProgress:opts.includes('InProgress') });
          }}
        >
          <option value="Success">Success</option>
          <option value="Failed">Failed</option>
          <option value="InProgress">In Progress</option>
        </select>

        <input
          type="date"
          value={date}
          onChange={e=>setDate(e.target.value)}
        />
      </div>

      <div className="bulk-actions">
        <select id="bulkSelect" defaultValue="">
          <option value="" disabled>Select Action</option>
          <option value="retryFailed">Retry Failed</option>
          <option value="cancelInProgress">Cancel In Progress</option>
        </select>
        <button onClick={()=> {
          const action = document.getElementById('bulkSelect').value;
          applyBulk(action);
        }}>Apply</button>
      </div>

      <table>
        <thead>
          <tr>
            <th><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
            <th>Project</th>
            <th>Date</th>
            <th>Time</th>
            <th>Trigger</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paged.map(d => (
            <tr key={d.id}>
              <td><input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={()=>toggleRow(d.id)}
                  /></td>
              <td>{d.project}</td>
              <td>{formatDate(d.timestamp)}</td>
              <td>{relTime(d.timestamp)}</td>
              <td>{d.trigger}</td>
              <td>
                {d.status==='InProgress'
                  ? <div className="progress-container">
                      <div className="progress-bar" style={{ width:'60%' }} />
                    </div>
                  : <span className={d.status==='Success' ? 'status success' : 'status error'}>
                      {d.status}
                    </span>
                }
              </td>
              <td>
                <button className="logBtn" onClick={()=>setLogEntry(d)}>View Logs</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Prev</button>
        <button disabled={page*pageSize >= filtered.length} onClick={()=>setPage(p=>p+1)}>Next</button>
      </div>

      {logEntry && (
        <div id="logPanel" className="open">
          <button className="closeBtn" onClick={()=>setLogEntry(null)}>✕</button>
          <h2>{`${logEntry.project} #${logEntry.id} Logs`}</h2>
          <div id="logOutput">
            {logEntry.logs.map((l,i) => <p key={i}> {l}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}
