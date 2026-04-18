import { useState, useEffect, useCallback } from 'react';
import { fetchDeployments } from '../utils/api';

/**
 * Custom hook to fetch, filter, and paginate deployment history
 */
export function useDeployments() {
  const [allDeploys, setAllDeploys] = useState([]);
  const [deploys, setDeploys] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filter, setFilter] = useState({ term: '', status: '', date: '' });

  useEffect(() => {
    async function load() {
      const data = await fetchDeployments();
      setAllDeploys(data);
    }
    load();
  }, []);

  const applyFilter = useCallback(() => {
    let d = allDeploys;
    if (filter.term) {
      const t = filter.term.toLowerCase();
      d = d.filter(x => x.project.toLowerCase().includes(t));
    }
    if (filter.status) d = d.filter(x => x.status === filter.status);
    if (filter.date) d = d.filter(x => x.date === filter.date);

    const start = (page - 1) * pageSize;
    setDeploys(d.slice(start, start + pageSize));
  }, [allDeploys, filter, page, pageSize]);

  useEffect(() => { applyFilter(); }, [applyFilter]);

  return { deploys, page, setPage, pageSize, total: allDeploys.length, filter, setFilter };
}