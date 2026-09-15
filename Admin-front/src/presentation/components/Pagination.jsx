import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ pagination, label = 'resultados' }) {
  const { page, setPage, totalItems, totalPages } = pagination;
  if (totalPages <= 1) return <div className="results-count">{totalItems} {label}</div>;
  return <nav className="pagination" aria-label={`Paginación de ${label}`}>
    <span>Página {page} de {totalPages} · {totalItems} {label}</span>
    <div className="pagination-actions">
      <button type="button" onClick={() => setPage(page - 1)} disabled={page === 1}><ChevronLeft />Anterior</button>
      <button type="button" onClick={() => setPage(page + 1)} disabled={page === totalPages}>Siguiente<ChevronRight /></button>
    </div>
  </nav>;
}
