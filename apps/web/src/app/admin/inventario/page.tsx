'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { InventarioFilters } from '@/features/inventario/components/InventarioFilters';
import { InventarioTable } from '@/features/inventario/components/InventarioTable';
import { ProductoModal } from '@/features/inventario/components/ProductoModal';
import { Pagination } from '@/components/ui';
import { Categoria, Almacen, ProductoInventario } from '@goldcontinent/shared/types/inventario';

interface ProductoAPI {
  id_producto: number;
  codigo: string;
  descripcion: string;
  tipo_flor: string | null;
  material: string | null;
  composicion: string | null;
  presentacion: string | null;
  numero_cabezas: number | null;
  tamano: string | null;
  colores_surtido: string[] | null;
  id_categoria: number | null;
  categoria: { id_categoria: number; nombre_categoria: string } | null;
  stock_total: number;
  stock_minimo: number;
  stock_principal: number;
  stock_tacna: number;
  foto_url: string | null;
  activo: boolean;
  stock_actual: Array<{
    id_almacen: number;
    cantidad: number;
    almacen: { id_almacen: number; nombre: string; ubicacion: string | null };
  }>;
}

interface PaginatedResponse {
  data: ProductoAPI[];
  items?: ProductoAPI[];
  total: number;
  page: number;
  limit: number;
}

const mapToProductoInventario = (p: ProductoAPI): ProductoInventario => ({
  id_producto: p.id_producto,
  codigo: p.codigo,
  descripcion: p.descripcion,
  tipo_flor: p.tipo_flor,
  material: p.material,
  composicion: p.composicion,
  presentacion: p.presentacion,
  numero_cabezas: p.numero_cabezas,
  tamano: p.tamano,
  colores_surtido: p.colores_surtido,
  id_categoria: p.id_categoria,
  categoria: p.categoria,
  stock_total: p.stock_total,
  stock_minimo: p.stock_minimo,
  stock_principal: p.stock_principal,
  stock_tacna: p.stock_tacna,
  foto_url: p.foto_url,
  activo: p.activo,
  stock_actual: p.stock_actual?.map(s => ({
    ...s,
    id_stock: 0,
    id_producto: p.id_producto,
    updated_at: new Date(),
    almacen: {
      ...s.almacen,
      codigo: `ALM-${String(s.almacen.id_almacen).padStart(3, '0')}`,
      activo: true,
    },
  })) || [],
  precios_actuales: null,
  unidades_por_caja: 1,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
});

export default function InventarioPage() {
  const [searchValue, setSearchValue] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedUbicacion, setSelectedUbicacion] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorConexion, setErrorConexion] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoInventario | null>(null);

  const fetchMetadata = useCallback(async () => {
    try {
      const [resCat, resAlm] = await Promise.all([
        apiClient('/categorias?limit=100').catch(() => ({ data: [] })),
        apiClient('/almacenes?activo=true&limit=100').catch(() => ({ data: [] })),
      ]);
      setCategorias(Array.isArray(resCat?.data) ? resCat.data : []);
      setAlmacenes(Array.isArray(resAlm?.data) ? resAlm.data : []);
    } catch (e) {
      console.error('Error cargando metadatos:', e);
    }
  }, []);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setErrorConexion(false);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        include: 'categoria,stock',
      });
      if (searchValue.trim()) params.append('search', searchValue.trim());
      if (selectedCategoria) params.append('id_categoria', selectedCategoria);
      if (selectedUbicacion) params.append('id_almacen', selectedUbicacion);

      const data = await apiClient(`/productos?${params.toString()}`) as PaginatedResponse;
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
  }, [searchValue, selectedCategoria, selectedUbicacion, currentPage, limit]);

  const handleEliminar = useCallback(async (id: number) => {
    if (confirm('¿Eliminar producto?')) {
      await apiClient(`/productos/${id}`, { method: 'DELETE' });
      fetchProductos();
    }
  }, [fetchProductos]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProductos(), 300);
    return () => clearTimeout(timer);
  }, [fetchProductos]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <div className="w-full max-w-[1700px] mx-auto space-y-6 font-['DM_Sans']">
      <InventarioFilters
        categorias={categorias}
        almacenes={almacenes}
        searchValue={searchValue}
        onSearchChange={(v) => { setSearchValue(v); setCurrentPage(1); }}
        selectedCategoria={selectedCategoria}
        onCategoriaChange={(v) => { setSelectedCategoria(v); setCurrentPage(1); }}
        selectedUbicacion={selectedUbicacion}
        onUbicacionChange={(v) => { setSelectedUbicacion(v); setCurrentPage(1); }}
        onAgregarProducto={() => { setModoModal('crear'); setProductoSeleccionado(null); setIsModalOpen(true); }}
        onRefresh={fetchProductos}
        loading={loading}
      />

      {errorConexion && (
        <div className="w-full bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span> Sin conexión con el servidor backend en puerto 3001. Verifica que la API esté encendida.</span>
          <button
            type="button"
            onClick={fetchProductos}
            className="underline font-bold text-red-700 hover:text-red-800 ml-2"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Contenedor principal de la Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/80 overflow-hidden">
        <InventarioTable
          productos={productos}
          loading={loading}
          onVerDetalle={(producto) => alert(`Detalle del producto: ${producto.codigo}`)}
          onEditar={(producto) => { setModoModal('editar'); setProductoSeleccionado(producto); setIsModalOpen(true); }}
          onEliminar={handleEliminar}
        />

        {Pagination && (
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
        )}
      </div>

      <ProductoModal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setProductoSeleccionado(null); }}
        onSuccess={() => fetchProductos()}
        modo={modoModal}
        productoInicial={productoSeleccionado ?? undefined}
      />
    </div>
  );
}