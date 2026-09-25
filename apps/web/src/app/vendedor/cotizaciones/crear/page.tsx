'use client';

import { Plus, Search, X, FileText, ArrowLeft, Save, Send, MessageSquare, Loader2, Zap, TrendingUp, Scale } from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { showToast } from '@/lib/toast';
import { RecomendacionesPanel } from '@/features/cotizaciones/components/RecomendacionesPanel';
import { formatCode } from '@/lib/formatters';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input, Select, Textarea } from '@/components/ui';
import { autosaveCotizacion, puedeAutosave } from '@/features/cotizaciones/api/autosave';

const VENDEDOR_DRAFT_KEY = 'vendedor-cotizacion-draft';

interface VendedorDraft {
  idCotizacionGuardada: number | null;
  formData: {
    id_cliente: string;
    tipo_precio: TipoPrecio;
    tipo_venta: TipoVenta;
    tipo_pago: TipoPago;
    dias_plazo: string;
    observaciones: string;
    incluye_carreta: boolean;
    costo_carreta: number;
    fecha_vencimiento: string;
  };
  detalles: DetalleItem[];
}

interface Producto {
  id_producto: number;
  codigo: string;
  descripcion: string;
  stock_total: number;
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
}

interface DetalleItem {
  id_producto: number;
  codigo: string;
  descripcion: string;
  tipo_venta: 'unidad' | 'docena' | 'mayor';
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

type TipoVenta = 'unidad' | 'docena' | 'mayor';
type TipoPrecio = 'normal' | 'distribuidor';
type TipoPago = 'contado' | 'credito';

const FORM_DATA_INICIAL = {
  id_cliente: '',
  tipo_precio: 'normal' as TipoPrecio,
  tipo_venta: 'unidad' as TipoVenta,
  tipo_pago: 'contado' as TipoPago,
  dias_plazo: '',
  observaciones: '',
  incluye_carreta: true,
  costo_carreta: 15,
  fecha_vencimiento: '',
};

export default function VendedorCotizacionCrearPage() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [searchProducto, setSearchProducto] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);

  const [idCotizacionGuardada, setIdCotizacionGuardada] = useState<number | null>(null);

  const [formData, setFormData] = useState(() => {
    if (typeof window === 'undefined') {
      return { ...FORM_DATA_INICIAL };
    }
    try {
      const raw = localStorage.getItem(VENDEDOR_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as VendedorDraft;
        if (parsed?.formData) return parsed.formData;
      }
    } catch {
      /* draft corrupto */
    }
    return { ...FORM_DATA_INICIAL };
  });

  const [detalles, setDetalles] = useState<DetalleItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(VENDEDOR_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as VendedorDraft;
        return Array.isArray(parsed?.detalles) ? parsed.detalles : [];
      }
    } catch {
      /* draft corrupto */
    }
    return [];
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(VENDEDOR_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as VendedorDraft;
        if (parsed?.idCotizacionGuardada != null) {
          setIdCotizacionGuardada(parsed.idCotizacionGuardada);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Índice del detalle seleccionado para ver recomendaciones IA (solo vía botón de ACCIONES)
  const [selectedDetalleIndex, setSelectedDetalleIndex] = useState<number | null>(null);
  // Cada clic en el botón de ACCIONES lo incrementa para forzar recarga (reintento)
  const [refreshKeyRecs, setRefreshKeyRecs] = useState(0);

  const handleAbrirRecomendaciones = useCallback((index: number) => {
    setSelectedDetalleIndex(index);
    setRefreshKeyRecs((k) => k + 1);
  }, []);

  const handleAgregarRecomendacion = useCallback((item: any, tipo: 'similar' | 'upsell' | 'equilibrio') => {
    const precio = item.precio;
    if (precio <= 0) return;

    const existingIndex = detalles.findIndex(
      (d) => d.id_producto === item.id_producto && d.tipo_venta === formData.tipo_venta
    );

    if (existingIndex >= 0) {
      const newDetalles = [...detalles];
      newDetalles[existingIndex] = {
        ...newDetalles[existingIndex],
        cantidad: newDetalles[existingIndex].cantidad + 1,
        subtotal: (newDetalles[existingIndex].cantidad + 1) * precio,
      };
      setDetalles(newDetalles);
    } else {
      setDetalles([
        ...detalles,
        {
          id_producto: item.id_producto,
          codigo: item.codigo,
          descripcion: item.descripcion,
          tipo_venta: formData.tipo_venta,
          cantidad: 1,
          precio_unitario: precio,
          subtotal: precio,
        },
      ]);
    }
    showToast.success(`Recomendación (${tipo.toUpperCase()}) agregada`);
    // El detalle agregado/actualizado queda como base activa del panel
    setSelectedDetalleIndex(existingIndex >= 0 ? existingIndex : detalles.length);
  }, [detalles, formData.tipo_venta]);

  const handleReemplazarRecomendacion = useCallback((itemExistenteId: string, nuevoItem: any, tipo: 'similar' | 'upsell' | 'equilibrio') => {
    const index = Number(itemExistenteId);
    const precio = nuevoItem.precio;
    const newDetalles = [...detalles];
    newDetalles[index] = {
      ...newDetalles[index],
      id_producto: nuevoItem.id_producto,
      codigo: nuevoItem.codigo,
      descripcion: nuevoItem.descripcion,
      precio_unitario: precio,
      subtotal: newDetalles[index].cantidad * precio,
    };
    setDetalles(newDetalles);
    showToast.success(`Reemplazado por recomendación (${tipo.toUpperCase()})`);
    // Mantener el detalle reemplazado como base activa del panel
    setSelectedDetalleIndex(index);
  }, [detalles]);

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

  const getPrecio = (producto: Producto): number => {
    if (!producto.precios_actuales) return 0;
    const precios = producto.precios_actuales;
    const key = `${formData.tipo_venta}_${formData.tipo_precio}` as keyof typeof precios;
    return Number(precios[key] || precios.precio_unidad_normal || 0);
  };

  const agregarProducto = (producto: Producto) => {
    const precio = getPrecio(producto);
    if (precio <= 0) return;

    const existingIndex = detalles.findIndex(
      (d) => d.id_producto === producto.id_producto && d.tipo_venta === formData.tipo_venta
    );

    if (existingIndex >= 0) {
      const newDetalles = [...detalles];
      newDetalles[existingIndex] = {
        ...newDetalles[existingIndex],
        cantidad: newDetalles[existingIndex].cantidad + 1,
        subtotal: (newDetalles[existingIndex].cantidad + 1) * precio,
      };
      setDetalles(newDetalles);
    } else {
      setDetalles([
        ...detalles,
        {
          id_producto: producto.id_producto,
          codigo: producto.codigo,
          descripcion: producto.descripcion,
          tipo_venta: formData.tipo_venta,
          cantidad: 1,
          precio_unitario: precio,
          subtotal: precio,
        },
      ]);
    }
    setShowProductModal(false);
    setSelectedProducto(null);
  };

  const actualizarCantidad = (index: number, cantidad: number) => {
    if (cantidad <= 0) {
      setDetalles(detalles.filter((_, i) => i !== index));
      if (selectedDetalleIndex === index) setSelectedDetalleIndex(null);
      else if (selectedDetalleIndex !== null && selectedDetalleIndex > index) setSelectedDetalleIndex(selectedDetalleIndex - 1);
      return;
    }
    const precio = detalles[index].precio_unitario;
    const newDetalles = [...detalles];
    newDetalles[index] = { ...newDetalles[index], cantidad, subtotal: cantidad * precio };
    setDetalles(newDetalles);
  };

  const eliminarItem = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
    if (selectedDetalleIndex === index) setSelectedDetalleIndex(null);
    else if (selectedDetalleIndex !== null && selectedDetalleIndex > index) setSelectedDetalleIndex(selectedDetalleIndex - 1);
  };

  const subtotal = detalles.reduce((sum, d) => sum + d.subtotal, 0);
  const descuentoGlobal = 0;
  const subtotalConDescuento = subtotal - descuentoGlobal;
  // IGV DESACTIVADO: los precios ya incluyen IGV.
  // Para reactivar en una próxima actualización: habilitar cálculo de IGV 18% aquí
  // y alinear con backend (CotizacionesService) + PDF.
  const total = subtotalConDescuento + (formData.incluye_carreta ? formData.costo_carreta : 0);

  // Persistir draft local en cada cambio
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const draft: VendedorDraft = {
        idCotizacionGuardada,
        formData,
        detalles,
      };
      localStorage.setItem(VENDEDOR_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage lleno */
    }
  }, [formData, detalles, idCotizacionGuardada]);

  // Autosave en servidor (debounce) cuando hay cliente + productos
  useEffect(() => {
    const clienteSnap = {
      id_cliente: formData.id_cliente ? Number(formData.id_cliente) : null,
      nombre: clientes.find((c) => String(c.id_cliente) === String(formData.id_cliente))?.nombre || '',
      clienteEditado: false,
    };
    const items = detalles.map((d) => ({
      id_producto: d.id_producto,
      tipo_venta: d.tipo_venta,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      observacion: null as string | null,
    }));
    if (!puedeAutosave(clienteSnap, items)) return;

    const t = window.setTimeout(async () => {
      setAutosaving(true);
      try {
        const res = await autosaveCotizacion({
          cliente: { ...clienteSnap, nombre: clienteSnap.nombre.trim() },
          items,
          tipoPrecioCliente: formData.tipo_precio === 'distribuidor' ? 'DISTRIBUIDOR' : 'TIENDA',
          incluyeCarreta: formData.incluye_carreta,
          costoCarreta: formData.incluye_carreta ? formData.costo_carreta : 0,
          observaciones: formData.observaciones,
          idCotizacionGuardada,
          tipoPago: formData.tipo_pago,
          fechaVencimiento: formData.fecha_vencimiento,
        });
        if (res != null && res.idCotizacion !== idCotizacionGuardada) {
          setIdCotizacionGuardada(res.idCotizacion);
        }
      } catch (e) {
        console.warn('[autosave vendedor] No se pudo guardar:', e);
      } finally {
        setAutosaving(false);
      }
    }, 1800);

    return () => window.clearTimeout(t);
  }, [formData, detalles, idCotizacionGuardada, clientes]);

  const limpiarDraft = () => {
    try {
      localStorage.removeItem(VENDEDOR_DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setIdCotizacionGuardada(null);
    // Vaciar también el estado: si no, el efecto de persistencia reescribe el
    // borrador recién borrado y "resucita" en la próxima visita.
    setFormData({ ...FORM_DATA_INICIAL });
    setDetalles([]);
  };

  const handleSubmit = async (estado: 'borrador' | 'enviada') => {
    if (!formData.id_cliente) {
      showToast.warning('Seleccione un cliente');
      return;
    }
    if (detalles.length === 0) {
      showToast.warning('Agregue al menos un producto');
      return;
    }

    setLoading(true);
    try {
      const clienteSnap = {
        id_cliente: Number(formData.id_cliente),
        nombre:
          clientes.find((c) => String(c.id_cliente) === String(formData.id_cliente))?.nombre || '',
        clienteEditado: false,
      };
      const items = detalles.map((d) => ({
        id_producto: d.id_producto,
        tipo_venta: d.tipo_venta,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
      }));

      const res = await autosaveCotizacion({
        cliente: clienteSnap,
        items,
        tipoPrecioCliente: formData.tipo_precio === 'distribuidor' ? 'DISTRIBUIDOR' : 'TIENDA',
        incluyeCarreta: formData.incluye_carreta,
        costoCarreta: formData.incluye_carreta ? formData.costo_carreta : 0,
        observaciones: formData.observaciones,
        idCotizacionGuardada,
      });

      if (res != null && estado === 'enviada') {
        const { cambiarEstadoCotizacion } = await import('@/features/cotizaciones/api/cotizacionApi');
        await cambiarEstadoCotizacion(res.idCotizacion, 'enviada');
      }

      limpiarDraft();
      showToast.success(
        estado === 'enviada' ? 'Cotización enviada exitosamente' : 'Cotización creada exitosamente'
      );
      router.push('/vendedor/cotizaciones');
    } catch (error: any) {
      showToast.error(error.message || 'Error al crear cotización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Cotización</h1>
          <p className="text-gray-500">Complete los datos y agregue productos</p>
        </div>
        <Link href="/vendedor/cotizaciones" className="text-sm text-brand-primary hover:text-brand-hover flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Cliente *"
                placeholder="Seleccionar cliente"
                value={formData.id_cliente}
                onChange={(e) => setFormData({ ...formData, id_cliente: String(e.target.value) })}
                options={clientes.map((c) => ({
                  label: `${c.nombre}${c.ruc_dni ? ` (${c.ruc_dni})` : ''}`,
                  value: c.id_cliente,
                }))}
              />

              <Select
                label="Tipo de Precio *"
                value={formData.tipo_precio}
                onChange={(e) => setFormData({ ...formData, tipo_precio: e.target.value as TipoPrecio })}
                options={[
                  { label: 'Normal', value: 'normal' },
                  { label: 'Distribuidor', value: 'distribuidor' },
                ]}
              />

              <Select
                label="Tipo de Venta *"
                value={formData.tipo_venta}
                onChange={(e) => setFormData({ ...formData, tipo_venta: e.target.value as TipoVenta })}
                options={[
                  { label: 'Unidad', value: 'unidad' },
                  { label: 'Docena', value: 'docena' },
                  { label: 'Mayor', value: 'mayor' },
                ]}
              />

              <Select
                label="Tipo de Pago *"
                value={formData.tipo_pago}
                onChange={(e) => setFormData({ ...formData, tipo_pago: e.target.value as TipoPago })}
                options={[
                  { label: 'Contado', value: 'contado' },
                  { label: 'Crédito', value: 'credito' },
                ]}
              />

              {formData.tipo_pago === 'credito' && (
                <Input
                  label="Días de Plazo"
                  type="number"
                  min={1}
                  max={360}
                  value={formData.dias_plazo}
                  onChange={(e) => setFormData({ ...formData, dias_plazo: e.target.value })}
                />
              )}

              <Input
                label="Fecha Vencimiento"
                type="date"
                value={formData.fecha_vencimiento}
                onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
              />
            </div>

            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.incluye_carreta}
                  onChange={(e) => setFormData({ ...formData, incluye_carreta: e.target.checked })}
                  className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                />
                <span className="text-sm text-gray-700">Incluye carreta (S/ {formData.costo_carreta})</span>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Productos</h2>
              <button
                onClick={() => setShowProductModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-hover transition-colors"
              >
                <Plus className="h-4 w-4" />
                Agregar
              </button>
            </div>

            {detalles.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No hay productos agregados</p>
                <p className="text-sm text-gray-400 mt-1">Haga clic en &quot;Agregar&quot; para buscar productos</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Tipo</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">P. Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalles.map((item, index) => (
                    <TableRow
                      key={index}
                      className={selectedDetalleIndex === index ? 'bg-brand-soft hover:bg-brand-soft' : ''}
                    >
                      <TableCell>
                        <p className="font-medium text-gray-900">{item.descripcion}</p>
                        <p className="text-xs text-gray-500 uppercase">{formatCode(item.codigo)}</p>
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600 capitalize">{item.tipo_venta}</TableCell>
                      <TableCell className="text-center">
                        <div className="w-20 mx-auto">
                          <Input
                            type="number"
                            min={1}
                            sizeVariant="sm"
                            value={item.cantidad}
                            onChange={(e) => actualizarCantidad(index, Number(e.target.value))}
                            className="text-center"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-900">
                        S/ {item.precio_unitario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        S/ {item.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => handleAbrirRecomendaciones(index)}
                          aria-label={`Ver recomendaciones de ${item.codigo}`}
                          className={`p-1 mr-1 rounded transition-colors ${selectedDetalleIndex === index
                            ? 'text-brand-primary bg-brand-soft'
                            : 'text-brand-options hover:text-brand-primary'
                            }`}
                          title="Ver recomendaciones IA"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => eliminarItem(index)}
                          className="text-danger hover:text-danger-hover p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              {formData.incluye_carreta && (
                <div className="flex justify-between text-gray-600">
                  <span>Carreta</span>
                  <span className="font-medium text-gray-900">S/ {formData.costo_carreta.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {/* IGV DESACTIVADO: precios ya incluyen IGV. Reactivar fila al habilitar IGV. */}
              <div className="border-t border-gray-200 pt-3 flex justify-between text-lg">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-brand-primary">S/ {total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
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
                onClick={() => handleSubmit('enviada')}
                disabled={loading || detalles.length === 0 || !formData.id_cliente}
                className="w-full px-4 py-2.5 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4 inline mr-2" />
                Enviar Cotización
              </button>
            </div>
          </div>

          {/* Recomendaciones IA */}
          <RecomendacionesPanel
            cartItems={detalles.map((d, i) => ({ id: String(i), id_producto: d.id_producto, codigo: d.codigo, descripcion: d.descripcion }))}
            selectedItemId={selectedDetalleIndex !== null ? String(selectedDetalleIndex) : null}
            tipoPrecioCliente={formData.tipo_precio === 'distribuidor' ? 'DISTRIBUIDOR' : 'TIENDA'}
            idCliente={formData.id_cliente ? Number(formData.id_cliente) : undefined}
            itemExistenteId={selectedDetalleIndex !== null ? String(selectedDetalleIndex) : null}
            refreshKey={refreshKeyRecs}
            onAgregar={handleAgregarRecomendacion}
            onReemplazar={handleReemplazarRecomendacion}
          />

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Observaciones</h3>
            <Textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={4}
              placeholder="Observaciones adicionales para el cliente..."
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
              <Input
                variant="modal"
                type="text"
                icon={<Search className="h-4 w-4" />}
                placeholder="Buscar por código o descripción..."
                value={searchProducto}
                onChange={(e) => setSearchProducto(e.target.value.toUpperCase())}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {filteredProductos.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No se encontraron productos</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredProductos.map((p) => (
                    <button
                      key={p.id_producto}
                      onClick={() => {
                        setSelectedProducto(p);
                        agregarProducto(p);
                      }}
                      className="p-3 border border-gray-200 rounded-lg hover:border-brand-primary hover:bg-brand-soft transition-colors text-left"
                    >
                      <p className="font-medium text-gray-900">{p.descripcion}</p>
                      <p className="text-sm text-gray-500">{p.codigo}</p>
                      <p className="text-sm text-brand-primary font-medium mt-1">
                        S/ {Number(getPrecio(p)).toLocaleString('es-PE', { minimumFractionDigits: 2 })} / {formData.tipo_venta}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}