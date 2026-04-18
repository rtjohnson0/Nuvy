import { useState, useCallback, useEffect } from 'react';
import { fetchProjects } from '../utils/api';

export function useProjects() {
  const [allProjects, setAllProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filter, setFilterState] = useState({ term: '', status: '', from: '', to: '' });
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(1);
  const [viewMode, setViewMode] = useState('cards');
  const [favs, setFavs] = useState(
    new Set(JSON.parse(localStorage.getItem('nuvyFavs') || '[]'))
  );
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    async function load() {
      const data = await fetchProjects();
      setAllProjects(data);
    }
    load();
  }, []);

  const filterProjects = useCallback(() => {
    const { term, status, from, to } = filter;
    let data = [...allProjects].filter(project => {
      let ok = true;

      if (term) {
        ok =
          project.name.toLowerCase().includes(term.toLowerCase()) ||
          project.status.toLowerCase().includes(term.toLowerCase());
      }

      if (status) ok = ok && project.status === status;
      if (from) ok = ok && new Date(project.updated) >= new Date(from);
      if (to) ok = ok && new Date(project.updated) <= new Date(to);

      return ok;
    });

    if (sortKey) {
      data.sort((a, b) => {
        if (a[sortKey] > b[sortKey]) return sortDir;
        if (a[sortKey] < b[sortKey]) return -sortDir;
        return 0;
      });
    }

    data.sort((a, b) => (favs.has(b.id) ? 1 : 0) - (favs.has(a.id) ? 1 : 0));

    setProjects(data);
  }, [allProjects, filter, sortKey, sortDir, favs]);

  useEffect(() => {
    filterProjects();
  }, [filterProjects]);

  const setFilter = updates => {
    setFilterState(prev => ({ ...prev, ...updates }));
  };

  const sortBy = key => {
    setSortKey(key);
    setSortDir(prev => (sortKey === key ? -prev : 1));
  };

  const toggleFav = id => {
    setFavs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('nuvyFavs', JSON.stringify([...next]));
      return next;
    });
  };

  const openDetail = project => setDetail(project);
  const closeDetail = () => setDetail(null);

  return {
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
  };
}