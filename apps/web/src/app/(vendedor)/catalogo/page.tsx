'use client';

import { Search, Filter, Grid, List, Package, Tag, ChevronDown, Eye, Plus } from 'lucide-react';
import { VendedorLayout } from '@/components/VendedorLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/authProvider';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';

interface Producto {
  id_producto: number;
  codigo: string;
  descripcion: string;
  stock_total: number;
  stock_minimo: number;
  precio_unidad_normal: number;
  precio_docena_normal: number;
  precio_mayor_normal: number;
  id_categoria: number | null;
  nombre_categoria: string | null;
}

interface Categoria {
  id_categoria: number;
  nombre_categoria: string;
}

function renderGridView(productos: Producto[]) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {productos.map((producto) => (
        <div key={producto.id_producto} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:shadow-md transition-all">
          <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center mb-3">
            <Package className="h-16 w-16 text-gray-300" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm text-gray-500">{producto.codigo}</span>
            {producto.nombre_categoria && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{producto.nombre_categoria}</span>
            )}
          </div>
          <p className="font-medium text-gray-900 text-sm line-clamp-2">{producto.descripcion}</p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-green-700">S/ ${producto.precio_unidad_normal.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Docena: S/ ${producto.precio_docena_normal.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Tag className="h-3.5 w-3.5" />
              <span>{producto.stock_total}</span>
              {producto.stock_total <= producto.stock_minimo && (
                <span className="text-red-500 font-medium">¡Stock bajo!</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderListView(productos: Producto[]) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr className="text-left text-sm text-gray-500">
            <th className="p-3">Código</th>
            <th className="p-3">Producto</th>
            <th className="p-3">Categoría</th>
            <th className="p-3">Stock</th>
            <th className="p-3">Precio Unit.</th>
            <th className="p-3">Precio Docena</th>
            <th className="p-3">Precio Mayor</th>
            <th className="p-3 w-24"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {productos.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-12 text-center text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No se encontraron productos</p>
              </td>
            </tr>
          ) : (
            renderTableRows({ productos })
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderTableRows({ productos }: { productos: Producto[] }) {
  return (
    <>
      {productos.map((producto) => (
        <tr key={producto.id_producto} className="hover:bg-gray-50">
          <td className="p-3 font-mono text-sm text-gray-900">{producto.codigo}</td>
          <td className="p-3 text-sm font-medium text-gray-900">{producto.descripcion}</td>
          <td className="p-3 text-sm text-gray-500">{producto.nombre_categoria || '-'}</td>
          <td className="p-3 text-sm text-gray-500">
            {producto.stock_total}
            {producto.stock_total <= producto.stock_minimo && (
              <span className="ml-2 text-red-500 text-xs font-medium">⚠ Stock bajo</span>
            )}
          </td>
          <td className="p-3 font-semibold text-green-700">S/ ${producto.precio_unidad_normal.toFixed(2)}</td>
          <td className="p-3 text-sm text-gray-600">S/ ${producto.precio_docena_normal.toFixed(2)}</td>
          <td className="p-3 text-sm text-gray-600">S/ ${producto.precio_mayor_normal.toFixed(2)}</td>
          <td className="p-3">
            <button className="p-2 text-gray-400 hover:text-green-700 hover:bg-gray-100 rounded-lg transition-colors" title="Ver detalle">
              <Eye className="h-4 w-4" />
            </button>
          </td>
        </tr>
      ))}
    </>
  );
}

function renderLoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 p-4">
          <div className="h-32 bg-gray-200 rounded mb-3" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function CatalogoPage() {
  const { usuario } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<number | 'todos'>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodData, catData] = await Promise.all([
          apiClient('/productos?limit=500'),
          apiClient('/categorias'),
        ]);
        if (prodData.success) {
          setProductos(prodData.data);
          setFilteredProductos(prodData.data);
        }
        if (catData.success) {
          setCategorias(catData.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = productos;
    if (search) {
      filtered = filtered.filter(p =>
        p.codigo.toLowerCase().includes(search.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (categoriaFilter !== 'todos') {
      filtered = filtered.filter(p => p.id_categoria === categoriaFilter);
    }
    setFilteredProductos(filtered);
  }, [search, categoriaFilter, productos]);

  return (
    <VendedorLayout title="Catálogo de Productos">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
          <p className="text-gray-500">Consulta de productos y precios</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
              className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm appearance-none"
            >
              <option value="todos">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre_categoria}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
              title="Vista en cuadrícula"
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
              title="Vista en lista"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        renderLoadingSkeleton()
      ) : viewMode === 'grid' ? (
        filteredProductos.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No se encontraron productos</p>
          </div>
        ) : (
          renderGridView(filteredProductos)
        )
      ) : (
        renderListView(filteredProductos)
      )}
    </VendedorLayout>
  );
}