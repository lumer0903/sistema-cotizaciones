'use client';

import { Plus, Search, X, CreditCard, ArrowLeft, Save, Printer } from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Producto {
  id_producto: number;
  codigo: string;
  descripcion: string;
  stock_total: number;
  stock_principal: number;
  stock_tacna: number;
  precios_actuales: {
    precio_unidad_normal: string;
    precio_docena_normal: string;
    precio_mayor_normal: string;
    precio_unidad_dist: string;
    precio_docena_dist: string;
    precio_mayor_dist: string;
  } | null;
}

interface Cliente {
  id_cliente: number;
  nombre: string;
  ruc_dni: string | null;
  diasCreditoDefecto: number | null;
  limiteCredito: string | null;
}

interface Almacen {
  id_almacen: number;
  nombre: string;
  codigo: string;
}

interface DetalleItem {
  id_producto: number;
  codigo: string;
  descripcion: string;
  tipo_venta: 'unidad' | 'docena' | 'mayor';
  cantidad: number;
  precio_unitario: number;
  descuento_item: number;
  subtotal: number;
  igv_item: number;
  total_item: number;
}

type TipoVenta = 'unidad' | 'docena' | 'mayor';
type TipoPrecio = 'normal' | 'distribuidor';
type TipoPago = 'contado' | 'credito';
type TipoDocumento = 'boleta' | 'factura' | 'nota_venta' | 'nota_credito' | 'nota_debito' | 'guia_remision';

const ALMACENES_DEFAULT: Almacen[] = [
  { id_almacen: 1, nombre: 'Principal', codigo: 'PRIN' },
  { id_almacen: 2, nombre: 'Tacna', codigo: 'TAC' },
];

export default function AdminVentaCrearPage() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [searchProducto, setSearchProducto] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [almacenes] = useState<Almacen[]>(ALMACENES_DEFAULT);

  const [formData, setFormData] = useState({
    id_cliente: '',
    tipo_documento: 'boleta' as TipoDocumento,
    tipo_precio: 'normal' as TipoPrecio,
    tipo_venta: 'unidad' as TipoVenta,
    tipo_pago: 'contado' as TipoPago,
    dias_plazo: '',
    id_almacen: '1',
    observaciones: '',
    descuento_global: 0,
  });

  const [detalles, setDetalles] = useState<DetalleItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientesRes, productosRes] = await Promise.all([
          apiClient('/clientes?activo=true&limit=1000'),
          apiClient('/productos?activo=true&include=precios&limit=1000'),
        ]);
        setClientes(clientesRes.data || []);
        setProductos(productosRes.data || []);
        setFilteredProductos(productosRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const filtered = productos.filter(
      (p) =>
        p.codigo.toLowerCase().includes(searchProducto.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchProducto.toLowerCase())
    );
    setFilteredProductos(filtered);
  }, [searchProducto, productos]);

  const getStock = (producto: Producto, almacenId: string): number => {
    if (almacenId === '1') return producto.stock_principal;
    if (almacenId === '2') return producto.stock_tacna;
    return producto.stock_total;
  };

  const getPrecio = (producto: Producto): number => {
    if (!producto.precios_actuales) return 0;
    const precios = producto.precios_actuales;
    const key = `${formData.tipo_venta}_${formData.tipo_precio}` as keyof typeof precios;
    return Number(precios[key] || precios.precio_unidad_normal || 0);
  };

  const agregarProducto = (producto: Producto) => {
    const precio = getPrecio(producto);
    if (precio <= 0) return;

    const stock = getStock(producto, formData.id_almacen);
    if (stock <= 0) {
      alert('Sin stock disponible en el almacén seleccionado');
      return;
    }

    const existingIndex = detalles.findIndex(
      (d) => d.id_producto === producto.id_producto && d.tipo_venta === formData.tipo_venta
    );

    if (existingIndex >= 0) {
      const newDetalles = [...detalles];
      const nuevaCantidad = newDetalles[existingIndex].cantidad + 1;
      if (nuevaCantidad > stock) {
        alert(`Stock máximo disponible: ${stock}`);
        return;
      }
      newDetalles[existingIndex] = {
        ...newDetalles[existingIndex],
        cantidad: nuevaCantidad,
        subtotal: nuevaCantidad * precio,
        igv_item: nuevaCantidad * precio * 0.18,
        total_item: nuevaCantidad * precio * 1.18,
      };
      setDetalles(newDetalles);
    } else {
      if (1 > stock) {
        alert(`Stock máximo disponible: ${stock}`);
        return;
      }
      setDetalles([
        ...detalles,
        {
          id_producto: producto.id_producto,
          codigo: producto.codigo,
          descripcion: producto.descripcion,
          tipo_venta: formData.tipo_venta,
          cantidad: 1,
          precio_unitario: precio,
          descuento_item: 0,
          subtotal: precio,
          igv_item: precio * 0.18,
          total_item: precio * 1.18,
        },
      ]);
    }
    setShowProductModal(false);
    setSelectedProducto(null);
  };

  const actualizarCantidad = (index: number, cantidad: number) => {
    if (cantidad <= 0) {
      setDetalles(detalles.filter((_, i) => i !== index));
      return;
    }
    const stock = getStock(
      productos.find((p) => p.id_producto === detalles[index].id_producto)!,
      formData.id_almacen
    );
    if (cantidad > stock) {
      alert(`Stock máximo disponible: ${stock}`);
      return;
    }
    const precio = detalles[index].precio_unitario;
    const newDetalles = [...detalles];
    newDetalles[index] = {
      ...newDetalles[index],
      cantidad,
      subtotal: cantidad * precio,
      igv_item: cantidad * precio * 0.18,
      total_item: cantidad * precio * 1.18,
    };
    setDetalles(newDetalles);
  };

  const eliminarItem = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const subtotal = detalles.reduce((sum, d) => sum + d.subtotal, 0);
  const descuentoGlobal = Number(formData.descuento_global) || 0;
  const subtotalConDescuento = subtotal - descuentoGlobal;
  const igv = subtotalConDescuento * 0.18;
  const total = subtotalConDescuento + igv;

  const handleSubmit = async (estado: 'borrador' | 'emitida') => {
    if (!formData.id_cliente) {
      alert('Seleccione un cliente');
      return;
    }
    if (detalles.length === 0) {
      alert('Agregue al menos un producto');
      return;
    }

    setLoading(true);
    try {
      await apiClient('/ventas', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          estado,
          id_almacen: Number(formData.id_almacen),
          tipo_precio: formData.tipo_precio,
          tipo_venta: formData.tipo_venta,
          tipo_pago: formData.tipo_pago,
          dias_plazo: formData.tipo_pago === 'credito' ? Number(formData.dias_plazo) : null,
          descuento_global: descuentoGlobal,
          detalle: detalles.map((d) => ({
            id_producto: d.id_producto,
            tipo_venta: d.tipo_venta,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            descuento_item: d.descuento_item,
            subtotal: d.subtotal,
            igv_item: d.igv_item,
            total_item: d.total_item,
          })),
        }),
      });
      router.push('/admin/ventas');
    } catch (error: any) {
      alert(error.message || 'Error al crear venta');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Venta</h1>
          <p className="text-gray-500">Registre una venta contado o crédito</p>
        </div>
        <Link href="/admin/ventas" className="text-sm text-primary-700 hover:text-primary-900 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select
                  value={formData.id_cliente}
                  onChange={(e) => setFormData({ ...formData, id_cliente: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nombre} {c.ruc_dni ? `(${c.ruc_dni})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Almacén *</label>
                <select
                  value={formData.id_almacen}
                  onChange={(e) => setFormData({ ...formData, id_almacen: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {almacenes.map((a) => (
                    <option key={a.id_almacen} value={a.id_almacen}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento *</label>
                <select
                  value={formData.tipo_documento}
                  onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value as TipoDocumento })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="boleta">Boleta</option>
                  <option value="factura">Factura</option>
                  <option value="nota_venta">Nota de Venta</option>
                  <option value="nota_credito">Nota de Crédito</option>
                  <option value="nota_debito">Nota de Débito</option>
                  <option value="guia_remision">Guía de Remisión</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Precio *</label>
                <select
                  value={formData.tipo_precio}
                  onChange={(e) => setFormData({ ...formData, tipo_precio: e.target.value as TipoPrecio })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="normal">Normal</option>
                  <option value="distribuidor">Distribuidor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Venta *</label>
                <select
                  value={formData.tipo_venta}
                  onChange={(e) => setFormData({ ...formData, tipo_venta: e.target.value as TipoVenta })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="unidad">Unidad</option>
                  <option value="docena">Docena</option>
                  <option value="mayor">Mayor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pago *</label>
                <select
                  value={formData.tipo_pago}
                  onChange={(e) => setFormData({ ...formData, tipo_pago: e.target.value as TipoPago })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>

              {formData.tipo_pago === 'credito' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Días de Plazo</label>
                  <input
                    type="number"
                    value={formData.dias_plazo}
                    onChange={(e) => setFormData({ ...formData, dias_plazo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                    max="360"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descuento Global</label>
                <input
                  type="number"
                  value={formData.descuento_global}
                  onChange={(e) => setFormData({ ...formData, descuento_global: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Productos</h2>
              <button
                onClick={() => setShowProductModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Agregar
              </button>
            </div>

            {detalles.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No hay productos agregados</p>
                <p className="text-sm text-gray-400 mt-1">Haga clic en "Agregar" para buscar productos</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Cant.</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">P. Unit.</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Desc.</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtotal</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">IGV</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {detalles.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.descripcion}</p>
                          <p className="text-xs text-gray-500 font-mono">{item.codigo}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 capitalize">{item.tipo_venta}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500">
                          {getStock(
                            productos.find((p) => p.id_producto === item.id_producto)!,
                            formData.id_almacen
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={item.cantidad}
                            onChange={(e) => actualizarCantidad(index, Number(e.target.value))}
                            min="1"
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          S/ {item.precio_unitario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={item.descuento_item}
                            onChange={(e) => {
                              const newDetalles = [...detalles];
                              newDetalles[index] = { ...newDetalles[index], descuento_item: Number(e.target.value) || 0 };
                              setDetalles(newDetalles);
                            }}
                            min="0"
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          S/ {item.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          S/ {item.igv_item.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-primary-700">
                          S/ {item.total_item.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => eliminarItem(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({detalles.length} items)</span>
                <span className="font-medium text-gray-900">S/ {subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
              </div>
              {descuentoGlobal > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Descuento Global</span>
                  <span className="font-medium text-red-600">- S/ {descuentoGlobal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Subtotal c/ descuento</span>
                <span className="font-medium text-gray-900">S/ {subtotalConDescuento.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IGV (18%)</span>
                <span className="font-medium text-gray-900">S/ {igv.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between text-lg">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-primary-700">S/ {total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => handleSubmit('borrador')}
                disabled={loading || detalles.length === 0 || !formData.id_cliente}
                className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4 inline mr-2" />
                Guardar Borrador
              </button>
              <button
                onClick={() => handleSubmit('emitida')}
                disabled={loading || detalles.length === 0 || !formData.id_cliente}
                className="w-full px-4 py-2.5 bg-primary-700 text-white font-medium rounded-lg hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CreditCard className="h-4 w-4 inline mr-2" />
                Emitir Venta
              </button>
              <button
                onClick={handlePrint}
                disabled={detalles.length === 0}
                className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Printer className="h-4 w-4 inline mr-2" />
                Vista Previa Impresión
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Observaciones</h3>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none"
              placeholder="Observaciones adicionales..."
            />
          </div>
        </div>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Seleccionar Producto</h3>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por código o descripción..."
                  value={searchProducto}
                  onChange={(e) => setSearchProducto(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {filteredProductos.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No se encontraron productos</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredProductos.map((p) => {
                    const stock = getStock(p, formData.id_almacen);
                    const precio = getPrecio(p);
                    return (
                      <button
                        key={p.id_producto}
                        onClick={() => {
                          setSelectedProducto(p);
                          agregarProducto(p);
                        }}
                        disabled={stock <= 0 || precio <= 0}
                        className={`p-3 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left ${stock <= 0 || precio <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{p.descripcion}</p>
                            <p className="text-sm text-gray-500 font-mono">{p.codigo}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-primary-700 font-medium">
                              S/ {precio.toLocaleString('es-PE', { minimumFractionDigits: 2 })} / {formData.tipo_venta}
                            </p>
                            <p className={`text-xs ${stock <= 5 ? 'text-red-600' : 'text-gray-500'}`}>
                              Stock: {stock}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}