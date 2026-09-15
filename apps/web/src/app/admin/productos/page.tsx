'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ChevronDown, 
  ChevronUp,
  ChevronRight, 
  ChevronsRight, 
  Pencil, 
  Trash2, 
  Plus,
  Package,
  LayoutList,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { apiClient } from '@/lib/apiClient';
import { AgregarProductoModal } from '@/components/inventario/AgregarProductoModal';

interface Producto {
  id_producto: number;
  codigo: string;
  descripcion: string;
  stock_total: number;
  stock_minimo: number;
  stock_principal: number;
  precio_unidad_normal: string;
  foto_url: string | null;
  id_categoria: number | null;
  categoria?: {
    id_categoria: number;
    nombre_categoria: string;
  } | null;
}

interface Categoria {
  id_categoria: number;
  nombre_categoria: string;
}

interface Almacen {
  id_almacen: number;
  codigo: string;
  nombre: string;
  ubicacion: string | null;
  activo: boolean;
}

const ITEMS_PER_PAGE = 10;

function ProductoRow({ item, onEdit, onDelete }: { item: Producto, onEdit: (p: Producto) => void, onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-none">
      {/* FILA PRINCIPAL */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="grid grid-cols-12 items-center py-3 px-6 hover:bg-amber-50/30 cursor-pointer transition-colors text-sm text-gray-700"
      >
        <div className="col-span-3 font-medium text-gray-800 truncate pr-2">{item.codigo}</div>
        <div className="col-span-3 text-gray-600 uppercase truncate pr-2">{item.categoria?.nombre_categoria || 'Sin categoría'}</div>
        <div className="col-span-3 text-gray-600 uppercase truncate pr-2">{item.stock_principal > 0 ? 'Stock Principal' : 'Sin asignar'}</div>
        <div className="col-span-1 font-bold text-emerald-500">{item.stock_total}</div>
        <div className="col-span-2 flex items-center justify-end gap-3 text-amber-600">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="p-1 hover:text-amber-700 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id_producto);
            }}
            className="p-1 text-red-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="p-1 text-gray-400">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* DETALLE EXPANDIDO */}
      {expanded && (
        <div className="bg-gray-50/70 p-6 border-y border-gray-100 transition-all">
          <div className="flex flex-col md:flex-row items-start gap-8">
            <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
              {item.foto_url ? (
                <img
                  src={item.foto_url}
                  alt={item.codigo}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Package className="w-12 h-12" />
                </div>
              )}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-xs">
              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider">CODIGO</span>
                <span className="font-medium text-gray-800 text-sm">{item.codigo}</span>
              </div>

              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider">TIPO</span>
                <span className="font-medium text-gray-800 text-sm">{item.categoria?.nombre_categoria || 'General'}</span>
              </div>

              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider">UBICACIÓN</span>
                <span className="font-medium text-gray-800 text-sm">{item.stock_principal > 0 ? 'Stock Principal' : 'Sin asignar'}</span>
              </div>

              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider">DESCRIPCIÓN</span>
                <span className="font-medium text-gray-800 text-sm line-clamp-2">{item.descripcion || 'Sin descripción'}</span>
              </div>

              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider">STOCK</span>
                <span className="font-medium text-gray-800 text-sm">{item.stock_total}</span>
              </div>

              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider">ACCIONES</span>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => onEdit(item)} className="text-amber-600 hover:text-amber-700">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(item.id_producto)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider">CATEGORIA</span>
                <span className="font-medium text-gray-800 text-sm">{item.categoria?.nombre_categoria || 'N/A'}</span>
              </div>

              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider">PRECIO</span>
                <span className="font-medium text-gray-800 text-sm">S/ {item.precio_unidad_normal}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminProductosPage() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  
  // Estados de filtros y paginación
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedUbicacion, setSelectedUbicacion] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Cargar categorías y almacenes para filtros
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [catRes, almRes] = await Promise.all([
          apiClient('/categorias?limit=100'),
          apiClient('/almacenes?activo=true&limit=100'),
        ]);
        setCategorias(catRes.data || []);
        setAlmacenes(almRes.data || []);
      } catch (error) {
        console.error('Error fetching filters:', error);
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchFilters();
  }, []);

  // Cargar productos
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await apiClient('/productos?limit=100&include=categoria');
        setProductos(response.data || []);
      } catch (error) {
        console.error('Error fetching productos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, []);

  // Filtrado de productos en tiempo real
  const filteredData = useMemo(() => {
    return productos.filter((item) => {
      const matchSearch =
        item.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.categoria?.nombre_categoria?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchCategoria = selectedCategoria ? item.id_categoria?.toString() === selectedCategoria : true;
      const matchUbicacion = selectedUbicacion ? true : true; // TODO: filtrar por almacén real

      return matchSearch && matchCategoria && matchUbicacion;
    });
  }, [productos, searchQuery, selectedCategoria, selectedUbicacion]);

  // Paginación
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const handleEdit = (p: Producto) => {
    router.push(`/admin/productos/${p.id_producto}`);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Eliminar producto?')) {
      console.log('Eliminar', id);
    }
  };

  return (
    <div className="p-2 sm:p-8 bg-gray-50/50 min-h-screen">
      {/* FILTROS */}
      <div className="bg-white p-4 rounded-xl border-2 border-amber-400 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row items-end justify-between gap-4">
          {/* BUSCAR */}
          <div className="flex-1 w-full">
            <label className="block text-xs font-black text-amber-600 uppercase tracking-wider mb-1">
              BUSCAR
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Buscar por todo"
                className="w-full pl-9 pr-4 py-2 text-sm border border-amber-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* CATEGORÍA */}
          <div className="w-full md:w-48">
            <label className="block text-xs font-black text-amber-600 uppercase tracking-wider mb-1">
              CATEGORIA
            </label>
            <div className="relative">
              <select
                value={selectedCategoria}
                onChange={(e) => { setSelectedCategoria(e.target.value); setCurrentPage(1); }}
                className="w-full appearance-none bg-white border border-amber-400 rounded-lg px-3 py-2 text-sm text-gray-500 pr-8 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">Seleccione</option>
                {categorias.map((cat) => (
                  <option key={cat.id_categoria} value={cat.id_categoria.toString()}>
                    {cat.nombre_categoria}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none" />
            </div>
          </div>

          {/* UBICACIÓN */}
          <div className="w-full md:w-48">
            <label className="block text-xs font-black text-amber-600 uppercase tracking-wider mb-1">
              UBICACIÓN
            </label>
            <div className="relative">
              <select
                value={selectedUbicacion}
                onChange={(e) => { setSelectedUbicacion(e.target.value); setCurrentPage(1); }}
                className="w-full appearance-none bg-white border border-amber-400 rounded-lg px-3 py-2 text-sm text-gray-500 pr-8 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">Seleccione</option>
                {almacenes.map((alm) => (
                  <option key={alm.id_almacen} value={alm.id_almacen.toString()}>
                    {alm.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none" />
            </div>
          </div>

          {/* VISTAS Y BOTÓN CREAR */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg border border-amber-400 ${
                  viewMode === 'list' ? 'bg-amber-50 text-amber-600' : 'text-amber-500 bg-white'
                }`}
              >
                <LayoutList className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg border border-amber-400 ${
                  viewMode === 'grid' ? 'bg-amber-50 text-amber-600' : 'text-amber-500 bg-white'
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              Agregar Producto <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {/* ENCABEZADOS DE TABLA */}
        <div className="hidden md:grid grid-cols-12 py-3 px-6 bg-gray-100 text-xs font-bold text-gray-600 uppercase tracking-wider">
          <div className="col-span-3">CODIGO</div>
          <div className="col-span-3">CATEGORIA</div>
          <div className="col-span-3">UBICACIÓN</div>
          <div className="col-span-1">STOCK</div>
          <div className="col-span-2 text-right">ACCIONES</div>
        </div>

        {/* FILAS */}
        <div className="divide-y divide-gray-100">
          {loading ? (
             <div className="p-12 text-center text-sm text-gray-500 bg-white">
               Cargando inventario...
             </div>
          ) : currentItems.length > 0 ? (
            currentItems.map((item) => (
              <ProductoRow key={item.id_producto} item={item} onEdit={handleEdit} onDelete={handleDelete} />
            ))
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center bg-white text-sm text-gray-500">
              <Package className="w-12 h-12 text-gray-300 mb-3" />
              <span>No hay productos registrados o no coinciden con la búsqueda.</span>
            </div>
          )}
        </div>
      </div>

      {/* PAGINACIÓN */}
      {!loading && filteredData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 font-medium px-2">
          <div className="flex items-center gap-2">
            <span>Page</span>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 flex items-center justify-center rounded-md font-bold transition-colors ${
                  currentPage === page
                    ? 'bg-amber-500 text-white'
                    : 'hover:bg-gray-200 text-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
            <button 
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            Mostrando <span className="font-bold text-gray-800">{currentItems.length}</span> de{' '}
            <span className="font-bold text-gray-800">{filteredData.length}</span>
          </div>
        </div>
      )}

      <AgregarProductoModal 
        open={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={() => {
          // Opcional: recargar los productos aquí
        }} 
      />
    </div>
  );
}