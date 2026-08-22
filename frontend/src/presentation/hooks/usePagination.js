import { useEffect, useMemo, useState } from 'react';

export function usePagination(items, pageSize = 10, resetKey = '') {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => { setPage(1); }, [resetKey]);
  useEffect(() => { setPage(current => Math.min(current, totalPages)); }, [totalPages]);

  const pageItems = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);
  return { page, pageItems, setPage, totalItems: items.length, totalPages };
}
