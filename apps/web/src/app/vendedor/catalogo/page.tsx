'use client';

import { Search, Filter, Grid, List, Package, Tag, ChevronDown, Eye } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState, useMemo } from 'react';
import { formatCode } from '@/lib/formatters';
import { useDebounce } from '@/hooks/useDebounce';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';

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
        <div key={producto.id_producto} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-primary hover:shadow-md transition-all">
          <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center mb-3">
            <Package className="h-16 w-16 text-gray-300" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-500 uppercase">{formatCode(producto.codigo)}</span>
            {producto.nombre_categoria && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{producto.nombre_categoria}</span>
            )}
          </div>
          <p className="font-medium text-gray-900 text-sm line-clamp-2">{producto.descripcion}</p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-brand-ink">S/ ${producto.precio_unidad_normal.toFixed(2)}</p>
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Precio Unit.</TableHead>
          <TableHead>Precio Docena</TableHead>
          <TableHead>Precio Mayor</TableHead>
          <TableHead className="w-24"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {productos.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="p-12 text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No se encontraron productos</p>
            </TableCell>
          </TableRow>
        ) : (
          renderTableRows({ productos })
        )}
      </TableBody>
    </Table>
  );
}

function renderTableRows({ productos }: { productos: Producto[] }) {
  return (
    <>
      {productos.map((producto) => (
        <TableRow key={producto.id_producto}>
          <TableCell className="text-sm text-gray-900 uppercase">{formatCode(producto.codigo)}</TableCell>
          <TableCell className="text-sm font-medium text-gray-900">{producto.descripcion}</TableCell>
          <TableCell className="text-sm text-gray-500">{producto.nombre_categoria || '-'}</TableCell>
          <TableCell className="text-sm text-gray-500">
            {producto.stock_total}
            {producto.stock_total <= producto.stock_minimo && (
              <span className="ml-2 text-red-500 text-xs font-medium">⚠ Stock bajo</span>
            )}
          </TableCell>
          <TableCell className="font-semibold text-brand-ink">S/ ${producto.precio_unidad_normal.toFixed(2)}</TableCell>
          <TableCell className="text-sm text-gray-600">S/ ${producto.precio_docena_normal.toFixed(2)}</TableCell>
          <TableCell className="text-sm text-gray-600">S/ ${producto.precio_mayor_normal.toFixed(2)}</TableCell>
          <TableCell>
            <button className="min-h-11 min-w-11 inline-flex items-center justify-center text-gray-500 hover:text-brand-ink hover:bg-brand-soft rounded-lg transition-colors" title="Ver detalle" aria-label="Ver detalle">
              <Eye className="h-4 w-4" />
            </button>
          </TableCell>
        </TableRow>
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
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const searchDebounced = useDebounce(search, 300);
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

  const filteredProductos = useMemo(() => {
    let filtered = productos;
    if (searchDebounced) {
      filtered = filtered.filter(p =>
        p.codigo.toLowerCase().includes(searchDebounced.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchDebounced.toLowerCase())
      );
    }
    if (categoriaFilter !== 'todos') {
      filtered = filtered.filter(p => p.id_categoria === categoriaFilter);
    }
    return filtered;
  }, [searchDebounced, categoriaFilter, productos]);

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
          <p className="text-gray-500">Consulta de productos y precios</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" aria-hidden="true" />
            <input
              type="text"
              placeholder="Buscar por código, descripción..."
              aria-label="Buscar por código o descripción"
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
              className="w-full h-11 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" aria-hidden="true" />
            <select
              value={categoriaFilter}
              aria-label="Filtrar por categoría"
              onChange={(e) => setCategoriaFilter(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
              className="h-11 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm appearance-none"
            >
              <option value="todos">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre_categoria}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
              title="Vista en cuadrícula"
              aria-label="Vista en cuadrícula"
              aria-pressed={viewMode === 'grid'}
            >
              <Grid className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
              title="Vista en lista"
              aria-label="Vista en lista"
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-5 w-5" aria-hidden="true" />
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
    </>
  );
}