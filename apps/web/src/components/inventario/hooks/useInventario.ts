'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { ProductoInventario, InventarioFilters, Categoria, Almacen } from '@goldcontinent/shared/types/inventario';

interface UseInventarioReturn {
  productos: ProductoInventario[];
  categorias: Categoria[];
  almacenes: Almacen[];
  loading: boolean;
  loadingFilters: boolean;
  filters: InventarioFilters;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  setFilters: (filters: Partial<InventarioFilters>) => void;
  setPage: (page: number) => void;
  refetch: () => Promise<void>;
}

const DEFAULT_FILTERS: InventarioFilters = {
  search: '',
  id_categoria: null,
  id_almacen: null,
  soloStockBajo: false,
  page: 1,
  limit: 10,
};

export function useInventario(initialFilters?: Partial<InventarioFilters>): UseInventarioReturn {
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [filters, setFiltersState] = useState<InventarioFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchCategorias = useCallback(async () => {
    try {
      const response = await apiClient('/categorias?limit=100');
      setCategorias(response.data || []);
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  }, []);

  const fetchAlmacenes = useCallback(async () => {
    try {
      const response = await apiClient('/almacenes?activo=true&limit=100');
      setAlmacenes(response.data || []);
    } catch (error) {
      console.error('Error fetching almacenes:', error);
    }
  }, []);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        include: 'precios,categoria,stock',
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.id_categoria) params.append('id_categoria', filters.id_categoria.toString());
      if (filters.id_almacen) params.append('id_almacen', filters.id_almacen.toString());
      if (filters.soloStockBajo) params.append('soloStockBajo', 'true');

      const response = await apiClient(`/productos?${params.toString()}`);
      setProductos(response.data || []);
      setTotalItems(response.total || 0);
      setTotalPages(Math.ceil((response.total || 0) / filters.limit) || 1);
    } catch (error) {
      console.error('Error fetching productos:', error);
      setProductos([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const setFilters = useCallback((newFilters: Partial<InventarioFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page ?? 1,
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFiltersState((prev) => ({ ...prev, page }));
  }, []);

  const refetch = useCallback(async () => {
    await fetchProductos();
  }, [fetchProductos]);

  // Cargar filtros iniciales
  useEffect(() => {
    Promise.all([fetchCategorias(), fetchAlmacenes()]).finally(() => {
      setLoadingFilters(false);
    });
  }, [fetchCategorias, fetchAlmacenes]);

  // Cargar productos cuando cambian filtros
  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  return {
    productos,
    categorias,
    almacenes,
    loading,
    loadingFilters,
    filters,
    currentPage: filters.page,
    totalPages,
    totalItems,
    setFilters,
    setPage,
    refetch,
  };
}