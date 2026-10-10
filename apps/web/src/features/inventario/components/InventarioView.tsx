'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { showToast } from '@/lib/toast';
import { InventarioFilters } from '@/features/inventario/components/InventarioFilters';
import { InventarioTable } from '@/features/inventario/components/InventarioTable';
import { ProductoModal } from '@/features/inventario/components/ProductoModal';
import { MovimientoModal } from '@/features/inventario/components/MovimientoModal';
import { TransferenciaModal } from '@/features/inventario/components/TransferenciaModal';
import { KardexModal } from '@/features/inventario/components/KardexModal';
import { Pagination, ConfirmModal, Button } from '@/components/ui';
import { useDebounce } from '@/hooks/useDebounce';
import { Categoria, Almacen, ProductoInventario } from '@goldcontinent/shared/types/inventario';
import {
  ProductoAPI,
  PaginatedResponse,
  mapToProductoInventario,
} from '@/features/inventario/mappers';

export function InventarioView() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') || '';
  
  const [searchValue, setSearchValue] = useState(initialSearch);
  const searchDebounced = useDebounce(searchValue, 300);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedUbicacion, setSelectedUbicacion] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(8);

  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [errorConexion, setErrorConexion] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoInventario | null>(null);

  const [isMovimientoOpen, setIsMovimientoOpen] = useState(false);
  const [productoParaMovimiento, setProductoParaMovimiento] = useState<number | null>(null);
  const [isTransferenciaOpen, setIsTransferenciaOpen] = useState(false);
  const [productoParaTransferencia, setProductoParaTransferencia] = useState<number | null>(null);
  const [isKardexOpen, setIsKardexOpen] = useState(false);
  const [productoParaKardex, setProductoParaKardex] = useState<ProductoInventario | null>(null);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setErrorConexion(false);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        include: 'precios,categoria,stock',
      });
      if (searchDebounced.trim()) params.append('search', searchDebounced.trim());
      if (selectedCategoria) params.append('id_categoria', selectedCategoria);
      if (selectedUbicacion) params.append('id_almacen', selectedUbicacion);

      const data = (await apiClient(`/productos?${params.toString()}`)) as PaginatedResponse<ProductoAPI>;
      const raw = Array.isArray(data?.data) ? data.data : data?.items || [];
      const mapped = raw.map(mapToProductoInventario);
      setProductos(mapped);
      setTotalItems(data?.total || 0);
    } catch (err) {
      console.error('Error al conectar con la API:', err);
      setErrorConexion(true);
      setProductos([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, selectedCategoria, selectedUbicacion, currentPage, limit]);

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
    } catch (err) {
      console.error('Error eliminando producto:', err);
      showToast.error('Error al eliminar el producto');
    } finally {
      setDeleting(false);
    }
  }, [confirmDeleteId, fetchProductos]);

  const handleAbrirMovimiento = useCallback((productoId?: number) => {
    setProductoParaMovimiento(productoId ?? null);
    setIsMovimientoOpen(true);
  }, []);

  const handleAbrirTransferencia = useCallback((productoId?: number) => {
    setProductoParaTransferencia(productoId ?? null);
    setIsTransferenciaOpen(true);
  }, []);

  const handleAbrirKardex = useCallback((producto?: ProductoInventario) => {
    setProductoParaKardex(producto ?? null);
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
    return () => window.clearTimeout(timer);
  }, [fetchProductos]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <div className="w-full max-w-[1700px] mx-auto space-y-6 font-sans">
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
          <span> Sin conexión con el servidor backend en puerto 3001. Verifica que la API esté encendida.</span>
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
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/80 overflow-hidden">
        <InventarioTable
          productos={productos}
          loading={loading}
          onEditar={(producto) => { setModoModal('editar'); setProductoSeleccionado(producto); setIsModalOpen(true); }}
          onEliminar={handleEliminar}
          onMovimiento={handleAbrirMovimiento}
          onTransferencia={handleAbrirTransferencia}
          onKardex={handleAbrirKardex}
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
      </div>

      <ProductoModal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setProductoSeleccionado(null); }}
        onSuccess={() => { fetchProductos(); showToast.success('Producto guardado correctamente'); }}
        modo={modoModal}
        productoInicial={productoSeleccionado ?? undefined}
        categorias={categorias}
        almacenes={almacenes}
      />

      <MovimientoModal
        open={isMovimientoOpen}
        onClose={() => { setIsMovimientoOpen(false); setProductoParaMovimiento(null); }}
        onSuccess={() => { fetchProductos(); showToast.success('Movimiento registrado correctamente'); }}
        productoPreseleccionado={productoParaMovimiento}
        almacenes={almacenes}
      />

      <TransferenciaModal
        open={isTransferenciaOpen}
        onClose={() => { setIsTransferenciaOpen(false); setProductoParaTransferencia(null); }}
        onSuccess={() => { fetchProductos(); showToast.success('Transferencia realizada correctamente'); }}
        productoPreseleccionado={productoParaTransferencia}
        almacenes={almacenes}
      />

      <KardexModal
        open={isKardexOpen}
        onClose={() => { setIsKardexOpen(false); setProductoParaKardex(null); }}
        producto={productoParaKardex}
        almacenes={almacenes}
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
