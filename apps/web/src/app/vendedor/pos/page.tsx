'use client';

import { Search, CreditCard, Package, Plus, X, Check, ArrowLeft, Grid, List } from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';

interface Producto {
  id_producto: number;
  codigo: string;
  descripcion: string;
  stock_total: number;
  precio_unidad_normal: number;
  precio_docena_normal: number;
  precio_mayor_normal: number;
  unidades_por_caja: number;
}

interface CartItem {
  producto: Producto;
  cantidad: number;
  tipo_venta: 'unidad' | 'docena' | 'mayor';
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-gray-500">
      <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
      <p>No se encontraron productos</p>
    </div>
  );
}

function GridView({ filteredProductos, getPrecio, agregarAlCarrito }: { 
  filteredProductos: Producto[]; 
  getPrecio: (p: Producto, t: 'unidad' | 'docena' | 'mayor') => number;
  agregarAlCarrito: (p: Producto) => void;
}) {
  if (filteredProductos.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-[50vh] overflow-y-auto">
      {filteredProductos.map((producto) => (
        <div
          key={producto.id_producto}
          onClick={() => agregarAlCarrito(producto)}
          className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-green-300 hover:shadow-md transition-all"
        >
          <div className="h-24 bg-gray-50 rounded-lg flex items-center justify-center mb-3">
            <Package className="h-12 w-12 text-gray-400" />
          </div>
          <p className="font-medium text-gray-900 text-sm line-clamp-1">{producto.codigo}</p>
          <p className="text-gray-500 text-sm line-clamp-2">{producto.descripcion}</p>
          <p className="text-lg font-bold text-green-700 mt-2">S/ ${getPrecio(producto, 'unidad').toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">Stock: {producto.stock_total}</p>
        </div>
      ))}
    </div>
  );
}

function ListView({ filteredProductos, getPrecio, agregarAlCarrito }: { 
  filteredProductos: Producto[]; 
  getPrecio: (p: Producto, t: 'unidad' | 'docena' | 'mayor') => number;
  agregarAlCarrito: (p: Producto) => void;
}) {
  if (filteredProductos.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="p-12 text-center text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No se encontraron productos</p>
        </td>
      </tr>
    );
  }

  return (
    <>
      {filteredProductos.map((producto) => (
        <tr key={producto.id_producto} className="hover:bg-gray-50 cursor-pointer" onClick={() => agregarAlCarrito(producto)}>
          <td className="p-3 font-mono text-sm text-gray-900">{producto.codigo}</td>
          <td className="p-3 text-sm text-gray-900">{producto.descripcion}</td>
          <td className="p-3 text-sm text-gray-500">{producto.stock_total}</td>
          <td className="p-3 font-semibold text-green-700">S/ ${getPrecio(producto, 'unidad').toFixed(2)}</td>
          <td className="p-3">
            <button className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors">
              Agregar
            </button>
          </td>
        </tr>
      ))}
    </>
  );
}

export default function POSPage() {
  const { usuario } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedClient, setSelectedClient] = useState<{ id: number; nombre: string } | null>(null);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const data = await apiClient('/productos?limit=500');
        if (data.success) {
          setProductos(data.data);
          setFilteredProductos(data.data);
        }
      } catch (error) {
        console.error('Error fetching productos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, []);

  useEffect(() => {
    const filtered = productos.filter(p =>
      p.codigo.toLowerCase().includes(search.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredProductos(filtered);
  }, [search, productos]);

  const getPrecio = (producto: Producto, tipo: 'unidad' | 'docena' | 'mayor') => {
    switch (tipo) {
      case 'docena': return producto.precio_docena_normal;
      case 'mayor': return producto.precio_mayor_normal;
      default: return producto.precio_unidad_normal;
    }
  };

  const agregarAlCarrito = (producto: Producto) => {
    setCart(prev => {
      const existing = prev.find(item => item.producto.id_producto === producto.id_producto && item.tipo_venta === 'unidad');
      if (existing) {
        return prev.map(item =>
          item.producto.id_producto === producto.id_producto
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto, cantidad: 1, tipo_venta: 'unidad' }];
    });
  };

  const actualizarCantidad = (id: number, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.producto.id_producto === id);
      if (!item) return prev;
      const nuevaCantidad = item.cantidad + delta;
      if (nuevaCantidad <= 0) {
        return prev.filter(i => i.producto.id_producto !== id);
      }
      return prev.map(i => i.producto.id_producto === id ? { ...i, cantidad: nuevaCantidad } : i);
    });
  };

  const cambiarTipoVenta = (id: number, tipo: 'unidad' | 'docena' | 'mayor') => {
    setCart(prev => prev.map(item =>
      item.producto.id_producto === id ? { ...item, tipo_venta: tipo } : item
    ));
  };

  const subtotal = cart.reduce((sum, item) => sum + getPrecio(item.producto, item.tipo_venta) * item.cantidad, 0);
  const igv = subtotal * 0.18;
  const total = subtotal + igv;

  const handleVenta = async () => {
    if (cart.length === 0) return;
    if (!selectedClient) {
      alert('Seleccione un cliente');
      return;
    }

    try {
      const detalles = cart.map(item => ({
        idProducto: item.producto.id_producto,
        cantidad: item.cantidad,
        tipoVenta: item.tipo_venta,
      }));

      await apiClient('/ventas', {
        method: 'POST',
        body: JSON.stringify({
          idCliente: selectedClient.id,
          detalles,
          tipoPago: 'contado',
        }),
      });

      setCart([]);
      setSelectedClient(null);
      alert('Venta registrada correctamente');
    } catch (error) {
      console.error('Error en venta:', error);
      alert('Error al registrar la venta');
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto por código o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 p-4">
                  <div className="h-32 bg-gray-200 rounded mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : viewMode === 'grid' ? (
            <GridView 
              filteredProductos={filteredProductos} 
              getPrecio={getPrecio} 
              agregarAlCarrito={agregarAlCarrito} 
            />
          ) : (
            <ListView 
              filteredProductos={filteredProductos} 
              getPrecio={getPrecio} 
              agregarAlCarrito={agregarAlCarrito} 
            />
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col h-fit sticky top-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Carrito</h2>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Limpiar
              </button>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select
              value={selectedClient?.id || ''}
              onChange={(e) => setSelectedClient(e.target.value ? { id: Number(e.target.value), nombre: e.target.options[e.target.selectedIndex].text } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Seleccionar cliente...</option>
              <option value="1">Cliente General</option>
              <option value="2">Empresa ABC</option>
              <option value="3">Distribuidor XYZ</option>
            </select>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">El carrito está vacío</p>
              <p className="text-sm">Agrega productos desde el catálogo</p>
            </div>
          ) : (
            <div>
              <div className="space-y-3 mb-4 max-h-[30vh] overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.producto.id_producto} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.producto.descripcion}</p>
                      <p className="text-sm text-gray-500">{item.producto.codigo}</p>
                      <select
                        value={item.tipo_venta}
                        onChange={(e) => cambiarTipoVenta(item.producto.id_producto, e.target.value as 'unidad' | 'docena' | 'mayor')}
                        className="mt-1 px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                      >
                        <option value="unidad">Unidad</option>
                        <option value="docena">Docena</option>
                        <option value="mayor">Mayor</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => actualizarCantidad(item.producto.id_producto, -1)}
                        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center font-medium">{item.cantidad}</span>
                      <button
                        onClick={() => actualizarCantidad(item.producto.id_producto, 1)}
                        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <span className="font-semibold text-gray-900 w-20 text-right">
                        S/ ${(getPrecio(item.producto, item.tipo_venta) * item.cantidad).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">S/ ${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">IGV (18%)</span>
                  <span className="font-medium">S/ ${igv.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-green-700">S/ ${total.toFixed(2)}</span>
                </div>

                <button
                  onClick={handleVenta}
                  disabled={!selectedClient}
                  className="w-full mt-4 py-3 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CreditCard className="h-5 w-5" />
                  Registrar Venta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}