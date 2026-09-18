import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleLastPage = () => {
    onPageChange(totalPages)
  }

  const handleFirstPage = () => {
    onPageChange(1)
  }

  const pageNumbers = []
  for (let i = 1; i <= 5 && i <= totalPages; i++) {
    pageNumbers.push(i)
  }

  return (
    <div
      className="w-full flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-white"
    >
      {/* LADO IZQUIERDO: Navegación de páginas */}
      <div className="flex items-center gap-2">
        <span className="text-neutral-700 text-base font-light">
          Page
        </span>

        {/* Botones de página 1-5 */}
        {pageNumbers.map((page) => (
          <button
            key={page}
            className={`w-7 h-7 p-2.5 text-center text-base font-light rounded-lg
              ${currentPage === page
                ? 'bg-yellow-500 text-white'
                : 'bg-white text-neutral-700 border border-gray-200'}
              cursor-pointer hover:bg-gray-50 ${currentPage === page
                ? ''
                : 'transition-colors'}
            `}
            onClick={() => handlePageChange(page)}
            disabled={currentPage === page}
            aria-label={`Page ${page}`}
          >
            {page}
          </button>
        ))}

        {/* Botón "Siguente >" */}
        <button
          onClick={handleNextPage}
          className="w-0 h-4 text-neutral-400 cursor-pointer rotate-90"
          aria-label="Siguiente página"
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="w-2 h-2" />
        </button>

        {/* Botón "Última >>" */}
        <button
          onClick={handleLastPage}
          className="w-2 h-2 text-neutral-400 cursor-pointer"
          aria-label="Última página"
          disabled={currentPage === totalPages}
        >
          <ChevronsRight className="w-2 h-2" />
        </button>
      </div>

      {/* LADO DERECHO: Información de items */}
      <div className="text-right">
        <span className="text-neutral-700 text-base font-light">
          Mostrando<span className="font-bold">{itemsPerPage}</span> de{" "}{totalItems}
        </span>
      </div>
    </div>
  )
}

export default Pagination