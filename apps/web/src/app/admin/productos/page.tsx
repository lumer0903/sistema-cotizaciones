'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  ChevronsRight, 
  Pencil, 
  Trash2, 
  Plus,
  Package
} from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { apiClient } from '@/lib/apiClient';

interface Producto {
  id_producto: number;
  codigo: string;
  descripcion: string;
  stock_total: number;
  stock_minimo: number;
  precio_unidad_normal: string;
  foto_url: string | null;
  // Campos simulados para el diseño
  categoria?: string;
  ubicacion?: string;
}

const ITEMS_PER_PAGE = 10;

export default function AdminProductosPage() {
  const { usuario } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de filtros y paginación
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedUbicacion, setSelectedUbicacion] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await apiClient('/productos?limit=100');
        // Agregamos categorías y ubicaciones falsas para que coincida con tu diseño temporalmente
        const dataConFalsos = (response.data || []).map((p: any, i: number) => ({
          ...p,
          categoria: 'ADORNO',
          ubicacion: 'ESTANTE ' + (i % 3 === 0 ? 'A' : i % 2 === 0 ? 'B' : 'C')
        }));
        setProductos(dataConFalsos);
      } catch (error) {
        console.error('Error fetching productos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, []);

  // Categorías y Ubicaciones dinámicas
  const categoriasUnicas = useMemo(() => {
    return Array.from(new Set(productos.map((i) => i.categoria))).filter(Boolean) as string[];
  }, [productos]);

  const ubicacionesUnicas = useMemo(() => {
    return Array.from(new Set(productos.map((i) => i.ubicacion))).filter(Boolean) as string[];
  }, [productos]);

  // Filtrado de productos en tiempo real
  const filteredData = useMemo(() => {
    return productos.filter((item) => {
      const matchSearch =
        item.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.categoria?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchCategoria = selectedCategoria ? item.categoria === selectedCategoria : true;
      const matchUbicacion = selectedUbicacion ? item.ubicacion === selectedUbicacion : true;

      return matchSearch && matchCategoria && matchUbicacion;
    });
  }, [productos, searchQuery, selectedCategoria, selectedUbicacion]);

  // Paginación
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR CON BOTÓN DE ACCIÓN */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-gray-800 tracking-wide">
          Gestión de Stock
        </h2>

        {/* BOTÓN AGREGAR PRODUCTO */}
        <Link
          href="/admin/productos/crear"
          className="flex items-center gap-2 bg-[#f8b602] hover:bg-[#e0a400] text-white px-5 py-2.5 rounded-[11px] font-black text-xs tracking-wider transition-colors cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>AGREGAR PRODUCTO</span>
        </Link>
      </div>

      {/* FILTROS */}
      <section className="bg-white p-6 rounded-[15px] border-2 border-[#f8b602] shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* BUSCAR */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#f8b602] uppercase tracking-wider">
              BUSCAR
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f8b602]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por código o descripción"
                className="w-full h-10 pl-9 pr-3 text-xs border border-[#f8b602] rounded-lg outline-none focus:ring-1 focus:ring-[#f8b602]"
              />
            </div>
          </div>

          {/* CATEGORÍA */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#f8b602] uppercase tracking-wider">
              CATEGORIA
            </label>
            <div className="relative">
              <select
                value={selectedCategoria}
                onChange={(e) => {
                  setSelectedCategoria(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 px-3 text-xs border border-[#f8b602] rounded-lg outline-none appearance-none bg-white pr-8 text-gray-600 cursor-pointer"
              >
                <option value="">Seleccione</option>
                {categoriasUnicas.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f8b602] pointer-events-none" />
            </div>
          </div>

          {/* UBICACIÓN */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#f8b602] uppercase tracking-wider">
              UBICACIÓN
            </label>
            <div className="relative">
              <select
                value={selectedUbicacion}
                onChange={(e) => {
                  setSelectedUbicacion(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 px-3 text-xs border border-[#f8b602] rounded-lg outline-none appearance-none bg-white pr-8 text-gray-600 cursor-pointer"
              >
                <option value="">Seleccione</option>
                {ubicacionesUnicas.map((ubic) => (
                  <option key={ubic} value={ubic}>
                    {ubic}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f8b602] pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* TABLA DE INVENTARIO */}
      <section className="space-y-3">
        {/* ENCABEZADO */}
        <div className="grid grid-cols-5 px-6 py-3 bg-[#eef0f2] rounded-lg text-xs font-bold text-gray-700 tracking-wider">
          <div>CODIGO</div>
          <div>CATEGORIA / DESCRIPCIÓN</div>
          <div>UBICACIÓN</div>
          <div>STOCK</div>
          <div className="text-right pr-4">ACCIONES</div>
        </div>

        {/* REGISTROS */}
        <div className="space-y-2">
          {loading ? (
             <div className="p-12 text-center bg-white rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">
               Cargando inventario...
             </div>
          ) : currentItems.length > 0 ? (
            currentItems.map((item) => (
              <div
                key={item.id_producto}
                className="grid grid-cols-5 px-6 py-4 bg-white rounded-lg border border-gray-100 shadow-sm items-center text-xs font-medium text-gray-600 hover:border-amber-200 transition-colors"
              >
                <div className="font-semibold text-gray-800">{item.codigo}</div>
                <div>
                  <div className="truncate">{item.categoria}</div>
                  <div className="text-[10px] text-gray-400 truncate mt-0.5">{item.descripcion}</div>
                </div>
                <div>{item.ubicacion}</div>
                <div className="flex flex-col">
                  <span className={`font-bold ${item.stock_total <= item.stock_minimo ? 'text-red-500' : 'text-emerald-500'}`}>
                    {item.stock_total}
                  </span>
                  {item.stock_total <= item.stock_minimo && (
                    <span className="text-[9px] text-red-400">Stock bajo</span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-3 pr-2">
                  <Link 
                    href={`/admin/productos/${item.id_producto}`}
                    className="text-amber-500 hover:text-amber-600 transition-colors cursor-pointer" 
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={() => {
                      if (confirm('¿Eliminar producto?')) {
                        // Aquí iría la lógica de eliminar
                        console.log('Eliminar', item.id_producto);
                      }
                    }}
                    className="text-amber-700 hover:text-red-600 transition-colors cursor-pointer" 
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="text-gray-400 hover:text-gray-600 ml-2 cursor-pointer">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center bg-white rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">
              <Package className="w-12 h-12 text-gray-300 mb-3" />
              <span>No hay productos registrados o no coinciden con la búsqueda.</span>
            </div>
          )}
        </div>
      </section>

      {/* PAGINACIÓN */}
      {!loading && filteredData.length > 0 && (
        <footer className="flex items-center justify-between pt-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-light text-gray-500">Page</span>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              const isActive = currentPage === page;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 flex items-center justify-center rounded font-bold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#f8b602] text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          <p>
            <span className="font-light">Mostrando </span>
            <span className="font-bold">{currentItems.length}</span>
            <span className="font-light"> de </span>
            <span className="font-bold">{filteredData.length}</span>
          </p>
        </footer>
      )}
    </div>
  );
}