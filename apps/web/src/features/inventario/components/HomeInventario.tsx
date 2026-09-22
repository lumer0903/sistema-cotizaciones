'use client';

import { useInventario } from '../hooks/useInventario';
import { useInventarioModals } from '../hooks/useInventarioModals';
import { InventarioTable } from './InventarioTable';
import { InventarioFilters } from './InventarioFilters';

export function HomeInventario() {
  const {
    productos,
    categorias,
    almacenes,
    loading,
    filters,
    currentPage,
    totalPages,
    totalItems,
    setFilters,
    setPage,
    refetch,
  } = useInventario();

  const {
    modalActivo,
    productoSeleccionado,
    abrirCrear,
    abrirEditar,
    abrirKardex,
    cerrarModales,
  } = useInventarioModals();

  const handleEditarClick = (p: any) => {
    abrirEditar(p);
  };

  const handleKardexClick = (p: any) => {
    abrirKardex(p);
  };

  const handleEliminar = (id: number) => {
    console.log('Eliminar:', id);
  };

  return (
    <div className="space-y-6 p-6">
      <InventarioFilters
        categorias={categorias}
        almacenes={almacenes}
        searchValue={filters.search}
        onSearchChange={(v) => setFilters({ search: v, page: 1 })}
        selectedCategoria={filters.id_categoria?.toString() ?? ''}
        onCategoriaChange={(v) => setFilters({ id_categoria: v ? Number(v) : null, page: 1 })}
        selectedUbicacion={filters.id_almacen?.toString() ?? ''}
        onUbicacionChange={(v) => setFilters({ id_almacen: v ? Number(v) : null, page: 1 })}
        onAgregarProducto={abrirCrear}
      />
      <InventarioTable
        productos={productos}
        loading={loading}
        onEditar={handleEditarClick}
        onEliminar={handleEliminar}
      />
    </div>
  );
}