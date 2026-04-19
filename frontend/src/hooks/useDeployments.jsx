import { useState, useEffect, useCallback } from 'react';
import { fetchDeployments } from '../utils/api';

export function useDeployments() {
  const [allDeploys, setAllDeploys] = useState([]);
  const [deploys, setDeploys] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filter, setFilter] = useState({ term: '', status: '', date: '' });
  const [loading, setLoading] = useState(true);

  const loadDeployments = useCallback(async () => {
    try {
      const data = await fetchDeployments();
      setAllDeploys(data);
    } catch (error) {
      console.error('Failed to load deployments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeployments();

    const interval = setInterval(() => {
      loadDeployments();
    }, 2000);

    return () => clearInterval(interval);
  }, [loadDeployments]);

  const applyFilter = useCallback(() => {
    let data = [...allDeploys];

    if (filter.term) {
      const term = filter.term.toLowerCase();
      data = data.filter(item => item.project.toLowerCase().includes(term));
    }

    if (filter.status) {
      data = data.filter(item => item.status === filter.status);
    }

    if (filter.date) {
      data = data.filter(item => item.date.startsWith(filter.date));
    }

    const start = (page - 1) * pageSize;
    setDeploys(data.slice(start, start + pageSize));
  }, [allDeploys, filter, page, pageSize]);

  useEffect(() => {
    applyFilter();
  }, [applyFilter]);

  const filteredTotal = allDeploys.filter(item => {
    const termMatch = filter.term
      ? item.project.toLowerCase().includes(filter.term.toLowerCase())
      : true;
    const statusMatch = filter.status ? item.status === filter.status : true;
    const dateMatch = filter.date ? item.date.startsWith(filter.date) : true;
    return termMatch && statusMatch && dateMatch;
  }).length;

  return {
    deploys,
    page,
    setPage,
    pageSize,
    total: filteredTotal,
    filter,
    setFilter,
    loading,
    refreshDeployments: loadDeployments
  };
}