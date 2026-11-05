'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient, apiErrorMessage } from '@/lib/apiClient';
import { invalidateInventarioQueries } from '@/lib/queryClient';
import { showToast } from '@/lib/toast';
import { InventarioFilters } from '@/features/inventario/components/InventarioFilters';
import { InventarioTable } from '@/features/inventario/components/InventarioTable';
import { ProductoModal } from '@/features/inventario/components/ProductoModal';
import { MovimientoModal } from '@/features/inventario/components/MovimientoModal';
import { TransferenciaModal } from '@/features/inventario/components/TransferenciaModal';
import { KardexModal } from '@/features/inventario/components/KardexModal';
import { AlertasStockTable } from './AlertasStockTable';
import { Pagination, ConfirmModal, Button } from '@/components/ui';
import { useDebounce } from '@/hooks/useDebounce';
import { TableDensityProvider } from '@/hooks/useTableDensity';
import { Categoria, Almacen, ProductoInventario } from '@goldcontinent/shared/types/inventario';
import {
  ProductoAPI,
  PaginatedResponse,
  mapToProductoInventario,
} from '@/features/inventario/mappers';

export function InventarioView() {
  return (
    <TableDensityProvider>
      <InventarioViewInner />
    </TableDensityProvider>
  );
}

function InventarioViewInner() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') || '';
  
  const [searchValue, setSearchValue] = useState(initialSearch);
  const searchDebounced = useDebounce(searchValue, 300);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedUbicacion, setSelectedUbicacion] = useState('');
  const [selectedStockEstado, setSelectedStockEstado] = useState('');
  const [isAlertasOpen,setIsAlertasOpen]=useState(false);
  const requestRef=useRef<AbortController|null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(8);

  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [errorConexion, setErrorConexion] = useState<string|null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoInventario | null>(null);

  const [isMovimientoOpen, setIsMovimientoOpen] = useState(false);
  const [isTransferenciaOpen, setIsTransferenciaOpen] = useState(false);
  const [isKardexOpen, setIsKardexOpen] = useState(false);

  const fetchProductos = useCallback(async () => {
    requestRef.current?.abort();
    const controller=new AbortController();requestRef.current=controller;
    setLoading(true);
    setErrorConexion(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        include: 'precios,categoria,stock',
        sortBy: 'stock_estado', // Ordenar por estado de stock (stock bajo primero)
        sortOrder: 'asc', // stock_bajo primero
      });
      if (searchDebounced.trim()) params.append('search', searchDebounced.trim());
      if (selectedCategoria) params.append('id_categoria', selectedCategoria);
      if (selectedUbicacion) params.append('id_almacen', selectedUbicacion);
      if (selectedStockEstado) params.append('stock_status', selectedStockEstado);

      const data = (await apiClient(`/productos?${params.toString()}`,{signal:controller.signal})) as PaginatedResponse<ProductoAPI>;
      if(controller.signal.aborted)return;
      const raw = Array.isArray(data?.data) ? data.data : data?.items || [];
      const mapped = raw.map(mapToProductoInventario);
      setProductos(mapped);
      setTotalItems(data?.total || 0);
    } catch (err) {
      console.error('Error al conectar con la API:', err);
      if(controller.signal.aborted)return;
      setErrorConexion(apiErrorMessage(err));
      setProductos([]);
      setTotalItems(0);
    } finally {
      if(!controller.signal.aborted)setLoading(false);
    }
  }, [searchDebounced, selectedCategoria, selectedUbicacion, selectedStockEstado, currentPage, limit]);

  const handleEliminar = useCallback((id: number) => {
    setConfirmDeleteId(id);
  }, []);

  const confirmarEliminar = useCallback(async () => {
    if (confirmDeleteId == null) return;
    setDeleting(true);
    try {
      await apiClient(`/productos/${confirmDeleteId}`, { method: 'DELETE' });
      showToast.success('Producto eliminado correctamente');
      setConfirmDeleteId(null);
      fetchProductos();
      await invalidateInventarioQueries();
    } catch (err) {
      console.error('Error eliminando producto:', err);
      showToast.error('Error al eliminar el producto');
    } finally {
      setDeleting(false);
    }
  }, [confirmDeleteId, fetchProductos]);

  const handleAbrirMovimiento = useCallback(() => {
    setIsMovimientoOpen(true);
  }, []);

  const handleAbrirTransferencia = useCallback(() => {
    setIsTransferenciaOpen(true);
  }, []);

  const handleAbrirKardex = useCallback(() => {
    setIsKardexOpen(true);
  }, []);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [resCat, resAlm] = await Promise.all([
          apiClient('/categorias?limit=100').catch(() => ({ data: [] })),
          apiClient('/almacenes?activo=true&limit=100').catch(() => ({ data: [] })),
        ]);
        setCategorias(Array.isArray(resCat?.data) ? resCat.data : []);
        setAlmacenes(Array.isArray(resAlm?.data) ? resAlm.data : []);
      } catch (e) {
        console.error('Error cargando metadatos:', e);
      } finally {
        setMetaLoading(false);
      }
    };

    fetchMetadata();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchProductos();
    }, 0);
    return () => {window.clearTimeout(timer);requestRef.current?.abort();};
  }, [fetchProductos]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <div className="w-full max-w-[1700px] mx-auto space-y-6 font-sans min-w-0">
      <h1 className="sr-only">Inventario</h1>
      <InventarioFilters
        categorias={categorias}
        almacenes={almacenes}
        searchValue={searchValue}
        onSearchChange={(v) => { setSearchValue(v.toUpperCase()); setCurrentPage(1); }}
        selectedCategoria={selectedCategoria}
        onCategoriaChange={(v) => { setSelectedCategoria(v); setCurrentPage(1); }}
        selectedUbicacion={selectedUbicacion}
        onUbicacionChange={(v) => { setSelectedUbicacion(v); setCurrentPage(1); }}
        onAlertas={()=>setIsAlertasOpen(true)}
        selectedStockEstado={selectedStockEstado}
        onStockEstadoChange={(v) => { setSelectedStockEstado(v); setCurrentPage(1); }}
        onAgregarProducto={() => { setModoModal('crear'); setProductoSeleccionado(null); setIsModalOpen(true); }}
        onMovimiento={() => handleAbrirMovimiento()}
        onTransferencia={() => handleAbrirTransferencia()}
        onKardex={() => handleAbrirKardex()}
        onRefresh={fetchProductos}
        loading={loading}
        metaLoading={metaLoading}
      />

      {errorConexion && (
        <div
          role="alert"
          className="w-full bg-estado-rechazado-soft border border-estado-rechazado/30 text-danger p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between"
        >
          <span>{errorConexion}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProductos}
            className="ml-2 underline font-bold text-red-700 hover:text-red-800"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Contenedor principal de la Tabla */}
      <div className="bg-surface rounded-2xl shadow-sm border border-border-default overflow-hidden">
        {!errorConexion && <>
        <InventarioTable
          productos={productos}
          almacenId={selectedUbicacion ? Number(selectedUbicacion) : undefined}
          loading={loading}
          onEditar={(producto) => { setModoModal('editar'); setProductoSeleccionado(producto); setIsModalOpen(true); }}
          onEliminar={handleEliminar}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          onPageChange={setCurrentPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setCurrentPage(1);
          }}
          loading={loading}
          itemLabel="productos"
        />
        </>}
      </div>

      <ProductoModal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setProductoSeleccionado(null); }}
        onSuccess={() => {
          fetchProductos();
          void invalidateInventarioQueries();
          showToast.success('Producto guardado correctamente');
        }}
        modo={modoModal}
        productoInicial={productoSeleccionado ?? undefined}
        categorias={categorias}
        almacenes={almacenes}
      />

      <MovimientoModal
        open={isMovimientoOpen}
        onClose={() => setIsMovimientoOpen(false)}
        onSuccess={() => {
          fetchProductos();
          void invalidateInventarioQueries();
          showToast.success('Movimiento registrado correctamente');
        }}
        almacenes={almacenes}
      />

      <TransferenciaModal
        open={isTransferenciaOpen}
        onClose={() => setIsTransferenciaOpen(false)}
        onSuccess={() => {
          fetchProductos();
          void invalidateInventarioQueries();
          showToast.success('Transferencia realizada correctamente');
        }}
        almacenes={almacenes}
      />

      <KardexModal
        open={isKardexOpen}
        onClose={() => setIsKardexOpen(false)}
        producto={null}
        almacenes={almacenes}
      />

      <AlertasStockTable
        open={isAlertasOpen}
        onClose={()=>setIsAlertasOpen(false)}
        onSuccess={() => {
          fetchProductos();
          void invalidateInventarioQueries();
        }}
      />

      <ConfirmModal
        open={confirmDeleteId != null}
        onClose={() => { if (!deleting) setConfirmDeleteId(null); }}
        onConfirm={confirmarEliminar}
        title="Eliminar producto"
        message="¿Eliminar producto? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
