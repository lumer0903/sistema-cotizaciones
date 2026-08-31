import { useState, useEffect } from 'react';
import { ArrowRight, FilePlus2, Store, Landmark, ChevronDown, CreditCard, Banknote, Smartphone, X, DollarSign, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson } from '../../infrastructure/http/apiClient';
import { AppLayout } from '../components/AppLayout';
import { money } from '../utils/format';

const initial = {
  idCliente: '',
  cliente_nombre: '',
  email: '',
  telefono: '',
  ruc_dni: '',
  tipo_precio: 'normal',
  tipoPago: 'contado',
  diasPlazo: '30',
  observaciones: '',
  descuento_global: '0',
  detalles: []
};

const TIPO_PAGO = { contado: 'Contado', credito: 'Crédito' };
const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'transferencia', label: 'Transferencia', icon: Banknote },
  { value: 'tarjeta_credito', label: 'Tarjeta Crédito', icon: CreditCard },
  { value: 'tarjeta_debito', label: 'Tarjeta Débito', icon: CreditCard },
  { value: 'yape_plin', label: 'Yape/Plin', icon: Smartphone },
  { value: 'mixto', label: 'Mixto', icon: DollarSign }
];

export function CreateVentaPage() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [invalid, setInvalid] = useState([]);
  const [error, setError] = useState('');
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [pagoModal, setPagoModal] = useState({ open: false, ventaId: null, montoPendiente: 0 });
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoPago, setMontoPago] = useState('');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [pagoLoading, setPagoLoading] = useState(false);
  const [pagoError, setPagoError] = useState('');
  const navigate = useNavigate();

  const field = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
    setInvalid(current => current.filter(item => item !== key));
  };

  const fieldDetalle = (index, key, value) => {
    setForm(current => ({
      ...current,
      detalles: current.detalles.map((d, i) => i === index ? { ...d, [key]: value } : d)
    }));
    setInvalid(current => current.filter(item => item !== `detalle-${index}-${key}`));
  };

  const agregarDetalle = () => {
    setForm(current => ({
      ...current,
      detalles: [...current.detalles, { idProducto: '', cantidad: 1, tipoVenta: 'unidad', precioUnitario: 0 }]
    }));
  };

  const eliminarDetalle = (index) => {
    setForm(current => ({
      ...current,
      detalles: current.detalles.filter((_, i) => i !== index)
    }));
  };

  const cargarClientes = useCallback(async () => {
    try {
      const data = await apiJson('/api/clientes');
      setClientes(data);
    } catch (e) { console.error(e); }
  }, []);

  const cargarProductos = useCallback(async () => {
    try {
      const data = await apiJson('/api/productos?activo=true');
      setProductos(data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    cargarClientes();
    cargarProductos();
  }, [cargarClientes, cargarProductos]);

  const clienteSeleccionado = clientes.find(c => c.id_cliente === Number(form.idCliente));

  // Calcular precio cuando cambia producto/cantidad
  const actualizarPrecioDetalle = (index, detalle) => {
    const prod = productos.find(p => p.id_producto === Number(detalle.idProducto));
    if (!prod) return;

    const tipoVenta = detalle.tipoVenta || 'unidad';
    const tipoPrecio = form.tipo_precio === 'distribuidor' ? 'distribuidor' : 'normal';
    const sufijo = tipoPrecio === 'distribuidor' ? 'dist' : 'normal';
    const campo = tipoVenta === 'docena' ? `precio_docena_${sufijo}` : tipoVenta === 'mayor' ? `precio_mayor_${sufijo}` : `precio_unidad_${sufijo}`;
    const precio = prod.precios_actuales?.[campo] || 0;

    fieldDetalle(index, 'precioUnitario', Number(precio || 0));
    fieldDetalle(index, 'tipoVenta', tipoVenta);
  };

  const validar = () => {
    const missing = [];
    if (!form.idCliente) missing.push('idCliente');
    if (!form.detalles.length) missing.push('detalles');
    form.detalles.forEach((d, i) => {
      if (!d.idProducto) missing.push(`detalle-${i}-idProducto`);
      if (!d.cantidad || d.cantidad < 1) missing.push(`detalle-${i}-cantidad`);
    });
    setInvalid(missing);
    return missing.length === 0;
  };

  const calcularTotales = () => {
    let subtotal = 0;
    form.detalles.forEach(d => {
      const cant = Number(d.cantidad || 0);
      const prec = Number(d.precioUnitario || 0);
      subtotal += cant * prec;
    });
    const igv = Number((subtotal * 0.18).toFixed(2));
    const desc = Number(form.descuento_global || 0);
    return { subtotal, igv, total: Number((subtotal + igv - desc).toFixed(2)) };
  };

  const { subtotal, igv, total } = calcularTotales();

  const handlePagoModal = (ventaId, montoPendiente) => {
    setPagoModal({ open: true, ventaId, montoPendiente });
    setMontoPago(montoPendiente);
    setReferenciaPago('');
    setPagoError('');
  };

  const handlePagoSubmit = async (e) => {
    e.preventDefault();
    const montoNum = Number(montoPago);
    if (!montoNum || montoNum <= 0) { setPagoError('Ingrese monto válido'); return; }
    if (montoNum > pagoModal.montoPendiente) { setPagoError(`Máx: ${money(pagoModal.montoPendiente)}`); return; }

    setPagoLoading(true); setPagoError('');
    try {
      await apiJson(`/api/ventas/${pagoModal.ventaId}/pagos`, {
        method: 'POST',
        body: JSON.stringify({ monto: montoNum, metodoPago, referencia: referenciaPago.trim() || undefined })
      });
      setPagoModal({ open: false, ventaId: null, montoPendiente: 0 });
      load(); // Recargar ventas
    } catch (e) { setPagoError(e.message); }
    finally { setPagoLoading(false); }
  };

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!validar()) return;
    setLoading(true);
    try {
      const { subtotal, igv, total } = calcularTotales();
      const data = await apiJson('/api/ventas', {
        method: 'POST',
        body: JSON.stringify({
          idCliente: Number(form.idCliente),
          tipo_precio: form.tipo_precio,
          detalles: form.detalles.map(d => ({
            idProducto: Number(d.idProducto),
            cantidad: Number(d.cantidad),
            tipoVenta: d.tipoVenta,
            precioUnitario: Number(d.precioUnitario),
            descuentoItem: 0
          })),
          tipoPago: form.tipoPago,
          diasPlazo: form.tipoPago === 'credito' ? Number(form.diasPlazo) : null,
          observaciones: form.observaciones,
          descuentoGlobal: Number(form.descuento_global || 0)
        })
      });
      navigate(`/venta-detalle?id=${data.id_venta}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const load = async () => {
    try {
      const data = await apiJson('/api/ventas');
    } catch (e) { console.error(e); }
  };

  const esVendedor = true; // Asumimos vendedor, se puede obtener del auth
  const puedeCredito = false; // Vendedor no puede crédito

  return (
    <AppLayout title="Crear Venta">
      <div className="max-w-4xl mx-auto space-y-6 select-none animate-in">
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 text-xs font-semibold text-red-650">
            {error}
          </div>
        )}

        {/* Card Principal */}
        <div className="bg-white border border-[#d9d9d9] rounded-2xl p-8 shadow-xs">
          {/* Cabecera */}
          <div className="flex items-start justify-between border-b border-[#d9d9d9] pb-6 mb-8">
            <div>
              <h2 className="text-base font-bold text-[#414141] tracking-tight">Nueva Venta</h2>
              <p className="text-xs text-neutral-450 mt-1">Registra una venta directa (WhatsApp, mostrador)</p>
            </div>
            <div className="rounded-lg p-2 bg-[#f8fafc] text-neutral-600">
              <FilePlus2 className="h-5 w-5" />
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={submit} className="space-y-6">
            {/* Cliente */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Cliente *</label>
              <div className="relative">
                <select
                  value={form.idCliente}
                  onChange={e => { field('idCliente', e.target.value); setSelectedCliente(clientes.find(c => c.id_cliente === Number(e.target.value))) }}
                  className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 pl-3 pr-10 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none appearance-none"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} ({c.tipo})</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-400">
                  <ChevronDown className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            {/* Info Cliente */}
            {clienteSeleccionado && (
              <div className="grid gap-4 sm:grid-cols-3 bg-[#f8fafc] rounded-xl p-4 border border-[#d9d9d9]/50">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Tipo</span>
                  <span className="text-xs font-medium text-[#414141]">{clienteSeleccionado.tipo}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Teléfono</span>
                  <span className="text-xs text-neutral-500">{clienteSeleccionado.telefono || '-'}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Email</span>
                  <span className="text-xs text-neutral-500">{clienteSeleccionado.email || '-'}</span>
                </div>
              </div>
            )}

            {/* Tipo Precio (Tarifas) */}
            <div className="space-y-3 pt-2">
              <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Tipo de Cliente (Tarifa)</label>
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => field('tipo_precio', 'normal')}
                  className={`
                    flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-150 outline-none
                    ${form.tipo_precio === 'normal'
                      ? 'border-[#7b1c1c] bg-[#fdf2f2] text-[#7b1c1c] shadow-2xs font-semibold'
                      : 'border-[#d9d9d9] text-[#414141] hover:border-[#7b1c1c]'}
                  `}
                >
                  <div className={`p-2 rounded-lg ${form.tipo_precio === 'normal' ? 'bg-[#7b1c1c] text-white' : 'bg-[#f8fafc]'}`}>
                    <Store className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Tarifa Tienda</h4>
                    <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Precios estándar</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => field('tipo_precio', 'distribuidor')}
                  className={`
                    flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-150 outline-none
                    ${form.tipo_precio === 'distribuidor'
                      ? 'border-[#7b1c1c] bg-[#fdf2f2] text-[#7b1c1c] shadow-2xs font-semibold'
                      : 'border-[#d9d9d9] text-[#414141] hover:border-[#7b1c1c]'}
                  `}
                >
                  <div className={`p-2 rounded-lg ${form.tipo_precio === 'distribuidor' ? 'bg-[#7b1c1c] text-white' : 'bg-[#f8fafc]'}`}>
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Tarifa Distribuidor</h4>
                    <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Precios con descuento</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Tipo Pago - Contado / Crédito */}
            <div className="space-y-3 pt-2">
              <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Tipo de Pago</label>
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => { field('tipoPago', 'contado'); field('diasPlazo', '30'); }}
                  className={`
                    flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-150 outline-none
                    ${form.tipoPago === 'contado'
                      ? 'border-[#7b1c1c] bg-[#fdf2f2] text-[#7b1c1c] shadow-2xs font-semibold'
                      : 'border-[#d9d9d9] text-[#414141] hover:border-[#7b1c1c]'}
                  `}
                >
                  <div className={`p-2 rounded-lg ${form.tipoPago === 'contado' ? 'bg-[#7b1c1c] text-white' : 'bg-[#f8fafc]'}`}>
                    <Banknote className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Contado</h4>
                    <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Pago inmediato</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => field('tipoPago', 'credito')}
                  disabled={!puedeCredito}
                  className={`
                    flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-150 outline-none
                    ${form.tipoPago === 'credito'
                      ? 'border-[#7b1c1c] bg-[#fdf2f2] text-[#7b1c1c] shadow-2xs font-semibold'
                      : 'border-[#d9d9d9] text-[#414141] hover:border-[#7b1c1c]'}
                    ${!puedeCredito ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className={`p-2 rounded-lg ${form.tipoPago === 'credito' ? 'bg-[#7b1c1c] text-white' : 'bg-[#f8fafc]'}`}>
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Crédito</h4>
                    <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                      {puedeCredito ? 'Pago a plazo (días)' : 'Solo admin/gerente'}
                    </p>
                  </div>
                </button>
              </div>
              {form.tipoPago === 'credito' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Días de plazo</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={form.diasPlazo}
                    onChange={e => field('diasPlazo', e.target.value)}
                    className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                    placeholder="Ej. 30"
                  />
                  {!puedeCredito && (
                    <p className="text-[10px] text-red-500">Solo administradores/gerentes pueden autorizar crédito</p>
                  )}
                </div>
              )}
            </div>

            {/* Descuento Global */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Descuento Global (S/)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                  <DollarSign className="h-4 w-4" />
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.descuento_global}
                  onChange={e => field('descuento_global', e.target.value)}
                  className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 pl-9 pr-4 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={e => field('observaciones', e.target.value)}
                rows={3}
                className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none resize-none"
                placeholder="Notas adicionales..."
              />
            </div>

            {/* Detalles de Productos */}
            <div className="space-y-4 pt-4 border-t border-[#d9d9d9]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#414141]">Productos</h3>
                <button type="button" onClick={agregarDetalle} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9d9d9] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#414141] hover:bg-[#fdf2f2] hover:text-[#7b1c1c] shadow-2xs transition-all">
                  <FilePlus2 className="h-3.5 w-3.5" />
                  <span>Agregar producto</span>
                </button>
              </div>

              {form.detalles.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  No hay productos agregados. Haz clic en "Agregar producto".
                </div>
              ) : (
                <div className="space-y-3">
                  {form.detalles.map((detalle, index) => (
                    <div key={index} className="bg-[#f8fafc] rounded-xl border border-[#d9d9d9] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#414141]">Producto #{index + 1}</h4>
                        {form.detalles.length > 1 && (
                          <button type="button" onClick={() => eliminarDetalle(index)} className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-4">
                        {/* Producto */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Producto *</label>
                          <select
                            value={detalle.idProducto}
                            onChange={e => { fieldDetalle(index, 'idProducto', e.target.value); actualizarPrecioDetalle(index, { ...detalle, idProducto: e.target.value }); }}
                            className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                          >
                            <option value="">Seleccionar...</option>
                            {productos.map(p => <option key={p.id_producto} value={p.id_producto}>{p.codigo} - {p.descripcion}</option>)}
                          </select>
                        </div>

                        {/* Cantidad */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Cantidad *</label>
                          <input
                            type="number"
                            min="1"
                            value={detalle.cantidad}
                            onChange={e => { fieldDetalle(index, 'cantidad', e.target.value); actualizarPrecioDetalle(index, { ...detalle, cantidad: e.target.value }); }}
                            className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                            placeholder="1"
                          />
                        </div>

                        {/* Tipo Venta */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Tipo Venta</label>
                          <select
                            value={detalle.tipoVenta}
                            onChange={e => { fieldDetalle(index, 'tipoVenta', e.target.value); actualizarPrecioDetalle(index, { ...detalle, tipoVenta: e.target.value }); }}
                            className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                          >
                            <option value="unidad">Unidad</option>
                            <option value="docena">Docena</option>
                            <option value="mayor">Mayor</option>
                          </select>
                        </div>

                        {/* Precio Unitario */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Precio Unitario (S/)</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                              <DollarSign className="h-4 w-4" />
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={detalle.precioUnitario}
                              onChange={e => fieldDetalle(index, 'precioUnitario', Number(e.target.value))}
                              className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 pl-9 pr-4 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                            />
                          </div>
                        </div>

                        {/* Subtotal línea */}
                        <div className="sm:col-span-4 pt-2 border-t border-[#d9d9d9]/50">
                          <div className="grid gap-4 sm:grid-cols-4 text-right">
                            <div className="sm:col-span-3 text-neutral-400 text-xs">Subtotal línea</div>
                            <div className="font-semibold text-[#414141]">{money(Number(detalle.cantidad || 0) * Number(detalle.precioUnitario || 0))}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button type="button" onClick={agregarDetalle} className="w-full sm:w-auto inline-flex items-center gap-1.5 rounded-lg border border-[#d9d9d9] bg-white px-4 py-2.5 text-xs font-semibold text-[#414141] hover:bg-[#fdf2f2] hover:text-[#7b1c1c] shadow-2xs transition-all">
                <FilePlus2 className="h-3.5 w-3.5" />
                <span>Agregar otro producto</span>
              </button>
            </div>

            {/* Totales */}
            <div className="bg-[#f8fafc] rounded-xl border border-[#d9d9d9] p-4 space-y-2">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="sm:col-span-2 text-right text-neutral-400 text-xs">Subtotal</div>
                <div className="text-right font-semibold text-[#414141]">{money(subtotal)}</div>
                <div className="sm:col-span-2 text-right text-neutral-400 text-xs">IGV (18%)</div>
                <div className="text-right font-semibold text-[#414141]">{money(igv)}</div>
                <div className="sm:col-span-2 text-right text-neutral-400 text-xs">Descuento</div>
                <div className="text-right font-semibold text-[#414141]">{money(Number(form.descuento_global || 0))}</div>
                <div className="sm:col-span-2 text-right text-neutral-400 text-xs border-t border-[#d9d9d9]/50 pt-2">Total</div>
                <div className="text-right text-lg font-bold text-[#7b1c1c]">{money(total)}</div>
              </div>
            </div>

            {invalid.length > 0 && (
              <div className="rounded-xl border border-red-100 bg-red-50/50 p-3 text-xs font-medium text-red-650">
                Completa todos los campos requeridos marcados con *
              </div>
            )}

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 border-t border-[#d9d9d9] pt-6">
              <Link
                to="/ventas"
                className="rounded-xl border border-[#d9d9d9] bg-white px-4 py-2.5 text-xs font-semibold text-[#414141] hover:bg-[#f8fafc] transition-all shadow-2xs"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-[#7b1c1c] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#601414] transition-all shadow-xs flex items-center gap-2"
              >
                <span>{loading ? 'Creando...' : 'Crear Venta'}</span>
                {!loading && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}