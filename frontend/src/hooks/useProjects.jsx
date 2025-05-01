import { useState, useCallback, useEffect } from 'react';

export function useProjects(initialData = []) {
  const [allProjects] = useState(initialData);
  const [projects, setProjects] = useState(initialData);
  const [filter, setFilterState] = useState({ term: '', status: '', from: '', to: '' });
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(1);
  const [viewMode, setViewMode] = useState('cards');
  const [favs, setFavs] = useState(new Set(JSON.parse(localStorage.getItem('nuvyFavs') || '[]')));
  const [detail, setDetail] = useState(null);

  const filterProjects = useCallback(() => {
    const { term, status, from, to } = filter;
    let data = allProjects.filter(p => {
      let ok = true;
      if (term) {
        ok = p.name.toLowerCase().includes(term.toLowerCase())
          || p.status.toLowerCase().includes(term.toLowerCase());
      }
      if (status) ok = ok && p.status === status;
      if (from)   ok = ok && new Date(p.updated) >= new Date(from);
      if (to)     ok = ok && new Date(p.updated) <= new Date(to);
      return ok;
    });

    if (sortKey) {
      data.sort((a, b) => {
        if (a[sortKey] > b[sortKey]) return sortDir;
        if (a[sortKey] < b[sortKey]) return -sortDir;
        return 0;
      });
    }

    // favorites first
    data.sort((a, b) => (favs.has(b.id) ? 1 : 0) - (favs.has(a.id) ? 1 : 0));

    setProjects(data);
  }, [allProjects, filter, sortKey, sortDir, favs]);

  // run on mount and whenever filter/sort/favs change
  useEffect(() => {
    filterProjects();
  }, [filter, filterProjects]);

  const setFilter = updates => {
    setFilterState(prev => ({ ...prev, ...updates }));
  };

  const sortBy = key => {
    setSortKey(key);
    setSortDir(prev => -prev);
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
    closeDetail,
  };
}
