'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  ShoppingCart,
  X,
  Loader2,
  FileText,
  Trash2,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { useCrearCotizacionStore } from '@/features/cotizaciones/store/useCrearCotizacionStore';

import {
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Badge,
} from '@/components/ui';
import { ProductoCarrito } from '@/features/cotizaciones/types/cotizacion';
import AgregarProductoModal, { ProductoBase } from '@/features/cotizaciones/components/AgregarProductoModal';
import { RecomendacionesPanel } from '@/features/cotizaciones/components/RecomendacionesPanel';
import { obtenerProductosImportados, getProximoNumeroCotizacion } from '@/features/cotizaciones/api/cotizacionApi';
import { ClienteAutocomplete } from '@/features/cotizaciones/components/ClienteAutocomplete';

/** Borrador vacío para una cotización totalmente nueva (ignora el persistido) */
const DRAFT_VACIO_NUEVO = {
  numeroCotizacion: 'COT-001',
  cliente: {
    id_cliente: null as number | null,
    nombre: '',
    telefono: '',
    email: '',
    tipoDocumento: 'DNI' as const,
    ruc_dni: '',
    clienteEditado: false,
  },
  fechaVencimiento: '',
  tipoPago: '',
  tipoPrecioCliente: 'DISTRIBUIDOR' as const,
  items: [] as ProductoCarrito[],
  incluyeCarreta: false,
  idCotizacionGuardada: null as number | null,
};

export default function CrearCotizacionPage() {
  const router = useRouter();
  const editandoId = useCrearCotizacionStore((s) => s.editandoId);
  // Entrada explícita como NUEVA (?nueva=1): ignorar el borrador persistido y empezar vacío.
  // (lectura directa de window para no requerir Suspense con useSearchParams)
  const esNueva =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('nueva') === '1';
  // Borrador persistido (sobrevive a Volver y a recargar la página) — salvo entrada como nueva
  const draftInicial = useMemo(
    () =>
      esNueva
        ? { ...DRAFT_VACIO_NUEVO, cliente: { ...DRAFT_VACIO_NUEVO.cliente }, items: [] as ProductoCarrito[] }
        : useCrearCotizacionStore.getState(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [esNueva],
  );
  const tieneBorradorPrevio =
    draftInicial.items.length > 0 ||
    draftInicial.idCotizacionGuardada != null ||
    draftInicial.cliente.nombre.trim() !== '' ||
    draftInicial.cliente.ruc_dni.trim() !== '';

  const [items, setItems] = useState<ProductoCarrito[]>(draftInicial.items);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [incluyeCarreta, setIncluyeCarreta] = useState(draftInicial.incluyeCarreta);
  const [tipoPrecioCliente, setTipoPrecioCliente] = useState<'DISTRIBUIDOR' | 'TIENDA'>(draftInicial.tipoPrecioCliente);

  // Formulario Información General
  const [nombre, setNombre] = useState(draftInicial.cliente.nombre);
  const [telefono, setTelefono] = useState(draftInicial.cliente.telefono);
  const [email, setEmail] = useState(draftInicial.cliente.email);
  const [tipoDocumento, setTipoDocumento] = useState<'DNI' | 'CE' | 'RUC'>(draftInicial.cliente.tipoDocumento);
  const [rucDni, setRucDni] = useState(draftInicial.cliente.ruc_dni);
  const [idCliente, setIdCliente] = useState<number | null>(draftInicial.cliente.id_cliente);
  const [clienteEditado, setClienteEditado] = useState(draftInicial.cliente.clienteEditado);
  const [fechaVencimiento, setFechaVencimiento] = useState(draftInicial.fechaVencimiento);
  const [tipoPago, setTipoPago] = useState(draftInicial.tipoPago);

  const inferirTipoDoc = (doc: string): 'DNI' | 'CE' | 'RUC' => {
    const d = (doc || '').trim();
    if (/^\d{8}$/.test(d)) return 'DNI';
    if (/^\d{11}$/.test(d)) return 'RUC';
    return 'CE';
  };

  const handleSelectClienteExistente = (c: { id_cliente: number; nombre: string; telefono?: string | null; email?: string | null; ruc_dni?: string | null } | null) => {
    if (!c) {
      setIdCliente(null);
      setClienteEditado(false);
      return;
    }
    setIdCliente(c.id_cliente);
    setNombre(c.nombre || '');
    setTelefono((c.telefono || '').replace(/\D/g, '').slice(0, 9));
    setEmail(c.email || '');
    setRucDni((c.ruc_dni || '').trim());
    setTipoDocumento(inferirTipoDoc(c.ruc_dni || ''));
    setClienteEditado(false);
  };

  const maxDocLength = tipoDocumento === 'DNI' ? 8 : tipoDocumento === 'RUC' ? 11 : 12;
  const docSoloNumeros = tipoDocumento !== 'CE';
  const docLabel = tipoDocumento === 'DNI' ? 'N° DNI' : tipoDocumento === 'RUC' ? 'N° RUC' : 'N° Carnet Extranjería';

  // Estados del Buscador y Productos de API
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [productosApi, setProductosApi] = useState<ProductoBase[]>([]);
  const [isLoadingProductos, setIsLoadingProductos] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Estados para el Modal Agregar Producto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productoParaModal, setProductoParaModal] = useState<ProductoBase | null>(null);

  // Producto del carrito seleccionado para ver recomendaciones IA (solo vía botón de ACCIONES)
  // refreshKeyRecs: cada clic en el botón de ACCIONES lo incrementa para forzar recarga
  const [refreshKeyRecs, setRefreshKeyRecs] = useState(0);
  // Generador de IDs únicos de carrito (evita colisiones de Date.now en clics rápidos/dobles)
  const cartSeqRef = useRef(0);
  const nextCartId = () => {
    cartSeqRef.current += 1;
    return `cart-${Date.now()}-${cartSeqRef.current}-${Math.floor(Math.random() * 1e6)}`;
  };

  // Número secuencial COT-001 (se conserva el del borrador; solo se pide uno nuevo si no hay borrador)
  const [numeroCotizacion, setNumeroCotizacion] = useState(draftInicial.numeroCotizacion);

  // Entrada como NUEVA: descartar borrador/edición previa del store y limpiar la URL
  // (quitar ?nueva=1 para que un F5 posterior retome el borrador en curso en vez de borrarlo)
  useEffect(() => {
    if (!esNueva) return;
    useCrearCotizacionStore.getState().reset();
    setItems([]);
    setSelectedItemId(null);
    setIncluyeCarreta(false);
    setTipoPrecioCliente('DISTRIBUIDOR');
    setNombre('');
    setTelefono('');
    setEmail('');
    setTipoDocumento('DNI');
    setRucDni('');
    setIdCliente(null);
    setClienteEditado(false);
    setFechaVencimiento('');
    setTipoPago('');
    setSearchQuery('');
    router.replace('/admin/cotizaciones/crear');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esNueva]);

  useEffect(() => {
    if (tieneBorradorPrevio) return;
    getProximoNumeroCotizacion()
      .then((n) => {
        setNumeroCotizacion(n);
        useCrearCotizacionStore.getState().setNumero(n);
      })
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistir el borrador ante cualquier cambio (Volver / recargar no pierden la información)
  useEffect(() => {
    useCrearCotizacionStore.getState().saveDraft({
      numeroCotizacion,
      cliente: { id_cliente: idCliente, nombre, telefono, email, tipoDocumento, ruc_dni: rucDni, clienteEditado },
      fechaVencimiento,
      tipoPago,
      tipoPrecioCliente,
      items,
      incluyeCarreta,
    });
  }, [numeroCotizacion, idCliente, nombre, telefono, email, tipoDocumento, rucDni, clienteEditado, fechaVencimiento, tipoPago, tipoPrecioCliente, items, incluyeCarreta]);

  // Empezar una cotización nueva desde cero
  const handleLimpiar = () => {
    useCrearCotizacionStore.getState().reset();
    setItems([]);
    setSelectedItemId(null);
    setIncluyeCarreta(false);
    setTipoPrecioCliente('DISTRIBUIDOR');
    setNombre('');
    setTelefono('');
    setEmail('');
    setTipoDocumento('DNI');
    setRucDni('');
    setIdCliente(null);
    setClienteEditado(false);
    setFechaVencimiento('');
    setTipoPago('');
    setSearchQuery('');
    getProximoNumeroCotizacion().then(setNumeroCotizacion).catch(() => { });
    showToast.success('Borrador limpio: nueva cotización');
  };

  // Cargar productos desde la API al montar
  const fetchProductos = useCallback(async () => {
    try {
      setIsLoadingProductos(true);
      const data = await obtenerProductosImportados();
      setProductosApi(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al obtener productos de la API:', error);
      showToast.error('No se pudieron cargar los productos del catálogo');
    } finally {
      setIsLoadingProductos(false);
    }
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  // Filtrar productos en tiempo real (Límite máximo: 3 resultados)
  const resultadosBusqueda = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return productosApi
      .filter(
        (p) =>
          p.codigo?.toLowerCase().includes(query) ||
          p.descripcion?.toLowerCase().includes(query)
      )
      .slice(0, 3);
  }, [searchQuery, productosApi]);

  // Selección de producto para modal
  const handleSeleccionarProducto = (producto: ProductoBase) => {
    setProductoParaModal(producto);
    setIsModalOpen(true);
    setShowDropdown(false);
    setSearchQuery('');
  };

  // Agregar item al carrito (solo agrega, no dispara recomendaciones)
  const handleAgregarProducto = (nuevoItem: ProductoCarrito) => {
    const id = nextCartId();
    setItems((prev) => [...prev, { ...nuevoItem, id }]);
  };

  // Eliminar item del carrito
  const handleEliminarItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  // Seleccionar producto para ver sus recomendaciones en el panel lateral (siempre activo).
  // Siempre fuerza recarga, incluso si ya estaba seleccionado (reintento).
  const handleAbrirRecomendaciones = (itemId: string) => {
    setSelectedItemId(itemId);
    setRefreshKeyRecs((k) => k + 1);
  };

  // Manejar agregar recomendación al carrito
  const handleAgregarRecomendacion = (item: any, tipo: 'similar' | 'upsell' | 'equilibrio') => {
    const nuevoItem: ProductoCarrito = {
      id: nextCartId(),
      id_producto: Number(item.id_producto ?? item.id ?? 0) || undefined,
      codigo: item.codigo,
      descripcion: item.descripcion,
      precioUnitario: Number(item.precio ?? 0),
      cantidad: 1,
      total: Number(item.precio ?? 0),
      tipo_venta: 'UNIDAD',
      observacion: `Sugerido por IA (${tipo.toUpperCase()})`,
      es_sugerido_ia: true,
      stock: Number(item.stock ?? 0),
      almacen: item.almacen,
      ubicacion: item.ubicacion,
    };
    setItems((prev) => [...prev, nuevoItem]);
    // El nuevo item queda como base activa del panel
    setSelectedItemId(nuevoItem.id);
  };

  // Manejar reemplazar item por recomendación
  const handleReemplazarRecomendacion = (itemExistenteId: string, nuevoItem: any, tipo: 'similar' | 'upsell' | 'equilibrio') => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemExistenteId
          ? {
            ...item,
            id_producto: Number(nuevoItem.id_producto ?? nuevoItem.id ?? (item as any).id_producto ?? 0) || (item as any).id_producto,
            codigo: nuevoItem.codigo,
            descripcion: nuevoItem.descripcion,
            precioUnitario: Number(nuevoItem.precio ?? 0),
            total: Number(nuevoItem.precio ?? 0) * item.cantidad,
            observacion: `Reemplazado por IA (${tipo.toUpperCase()})`,
            es_sugerido_ia: true,
            stock: Number(nuevoItem.stock ?? (item as any).stock ?? 0),
            almacen: nuevoItem.almacen ?? (item as any).almacen,
            ubicacion: nuevoItem.ubicacion ?? (item as any).ubicacion,
          }
          : item
      )
    );
    // Mantener el item reemplazado como base activa del panel
    setSelectedItemId(itemExistenteId);
  };

  // Cálculos de montos
  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.total, 0), [items]);
  const costoCarreta = incluyeCarreta ? 15.00 : 0.00;
  // IGV DESACTIVADO: los precios ya incluyen IGV.
  // Para reactivar en una próxima actualización: habilitar cálculo de IGV 18% aquí
  // y alinear con backend (CotizacionesService) + PDF.
  const total = subtotal + costoCarreta;

  return (
    <div className="p-0 md:p-0 w-full max-w-[1700px] mx-auto space-y-6 font-['DM_Sans']">

      {/* Encabezado */}
      <div className="flex justify-between items-center w-full px-1">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-brand-primary" />
          <span className="text-xl font-black text-zinc-700 tracking-tight">
            {numeroCotizacion}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {(items.length > 0 || nombre.trim() !== '' || rucDni.trim() !== '') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLimpiar}
              title="Descartar el borrador y empezar una cotización nueva"
            >
              Limpiar
            </Button>
          )}
          <Badge variant={editandoId != null ? 'secondary' : 'neutral'}>
            {editandoId != null ? 'EDITANDO' : 'BORRADOR'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* Columna Izquierda: Formulario y Carrito */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* Formulario Información General */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/80 space-y-4">
            <h2 className="text-lg font-bold text-zinc-700 mb-2">Información general</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <ClienteAutocomplete
                value={nombre}
                onChange={(v) => {
                  setNombre(v);
                  if (idCliente) setClienteEditado(true);
                }}
                onSelectCliente={handleSelectClienteExistente}
              />
              <Select
                label="Tipo de precio"
                value={tipoPrecioCliente}
                onChange={(e) => setTipoPrecioCliente(e.target.value as 'DISTRIBUIDOR' | 'TIENDA')}
                options={[
                  { label: 'Distribuidor', value: 'DISTRIBUIDOR' },
                  { label: 'Tienda', value: 'TIENDA' },
                ]}
              />
              <Input
                label="Teléfono"
                placeholder="Teléfono de contacto"
                value={telefono}
                maxLength={9}
                inputMode="numeric"
                onChange={(e) => {
                  setTelefono(e.target.value.replace(/\D/g, '').slice(0, 9));
                  if (idCliente) setClienteEditado(true);
                }}
              />

              <Input
                label="Email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (idCliente) setClienteEditado(true);
                }}
              />
              <Select
                label="Tipo de Documento"
                value={tipoDocumento}
                onChange={(e) => {
                  const v = String(e.target.value) as 'DNI' | 'CE' | 'RUC';
                  setTipoDocumento(v);
                  // Recorta el documento al cambiar de tipo
                  const max = v === 'DNI' ? 8 : v === 'RUC' ? 11 : 12;
                  setRucDni((prev) => (v === 'CE' ? prev.slice(0, max) : prev.replace(/\D/g, '').slice(0, max)));
                  if (idCliente) setClienteEditado(true);
                }}
                options={[
                  { label: 'DNI', value: 'DNI' },
                  { label: 'CE', value: 'CE' },
                  { label: 'RUC', value: 'RUC' },
                ]}
              />
              <Input
                label={docLabel}
                placeholder={tipoDocumento === 'RUC' ? '11 dígitos' : tipoDocumento === 'DNI' ? '8 dígitos' : 'Documento'}
                value={rucDni}
                maxLength={maxDocLength}
                inputMode={docSoloNumeros ? 'numeric' : 'text'}
                onChange={(e) => {
                  const raw = e.target.value;
                  const filtrado = docSoloNumeros ? raw.replace(/\D/g, '').slice(0, maxDocLength) : raw.slice(0, maxDocLength);
                  setRucDni(filtrado);
                  if (idCliente) setClienteEditado(true);
                }}
              />
              <Input
                label="Fecha de vencimiento"
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
              />
              <Select
                label="Tipo de pago"
                value={tipoPago}
                onChange={(e) => setTipoPago(String(e.target.value))}
                options={[
                  { label: 'Contado', value: 'CONTADO' },
                  { label: 'Crédito', value: 'CREDITO' },
                ]}
              />
            </div>
          </div>

          {/* Carrito y Buscador */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/80 space-y-4">
            <h2 className="text-lg font-bold text-zinc-700">Carrito</h2>

            {/* Input de Buscador */}
            <div className="relative">
              <div className="relative">
                <Input
                  ref={searchInputRef}
                  placeholder="Escribe el código o nombre del producto (ej: RY-)..."
                  icon={
                    isLoadingProductos ? (
                      <Loader2 className="size-4 animate-spin text-brand-primary" />
                    ) : (
                      <Search className="size-4 text-brand-primary" />
                    )
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                />
                {searchQuery && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setSearchQuery('');
                        setShowDropdown(false);
                      }}
                      aria-label="Limpiar búsqueda"
                      className="!px-1.5"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Menú Desplegable con Máximo 3 Resultados */}
              {showDropdown && searchQuery.trim() !== '' && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y divide-zinc-100">
                    {resultadosBusqueda.length > 0 ? (
                      resultadosBusqueda.map((prod, index) => (
                        <div
                          key={prod.id || prod.codigo || index}
                          onClick={() => handleSeleccionarProducto(prod)}
                          className="p-3 hover:bg-amber-50/60 cursor-pointer transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-xs bg-stone-100 px-2 py-1 rounded text-zinc-700 border border-stone-200 uppercase">
                              {String(prod.codigo).toUpperCase()}
                            </span>
                            <div>
                              <p className="text-xs font-medium text-zinc-700 leading-tight">
                                {prod.descripcion}
                              </p>
                              <p className="text-[10px] text-zinc-400 mt-0.5">
                                Stock Total: {prod.stockTotal ?? 'N/A'} | {prod.estante || 'Sin estante'}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="primary"
                            size="xs"
                            className="shrink-0"
                          >
                            Seleccionar
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-zinc-400">
                        {isLoadingProductos
                          ? 'Cargando catálogo...'
                          : `No se encontraron productos importados con "${searchQuery}"`}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Contenido Tabla Global / Estado Vacío */}
            {items.length === 0 ? (
              <div
                onClick={() => searchInputRef.current?.focus()}
                className="h-44 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col justify-center items-center gap-2 cursor-pointer hover:bg-stone-50/80 transition-colors"
              >
                <ShoppingCart className="size-8 text-zinc-300" />
                <span className="text-zinc-400 font-medium text-xs">
                  Busca un producto importado arriba para agregarlo
                </span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CÓDIGO</TableHead>
                    <TableHead>PRECIO UNITARIO</TableHead>
                    <TableHead>CANTIDAD</TableHead>
                    <TableHead>TOTAL</TableHead>
                    <TableHead className="text-center">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className={selectedItemId === item.id ? 'bg-amber-50/60' : ''}
                    >
                      <TableCell className="font-bold text-zinc-800">{item.codigo}</TableCell>
                      <TableCell className="text-zinc-600">S/ {item.precioUnitario.toFixed(2)}</TableCell>
                      <TableCell className="text-zinc-600">{item.cantidad}</TableCell>
                      <TableCell className="font-bold text-zinc-800">S/ {item.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex justify-center items-center gap-2">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleAbrirRecomendaciones(item.id)}
                            aria-label={`Ver recomendaciones de ${item.codigo}`}
                            title="Ver sugerencias"
                            className={`!px-1.5 ${selectedItemId === item.id
                              ? '!bg-brand-selection !text-brand-primary outline outline-1 outline-offset-[-1px] outline-brand-modalFocus'
                              : '!text-zinc-400 hover:!text-brand-primary'
                              }`}
                          >
                            <MessageSquare className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleEliminarItem(item.id)}
                            aria-label={`Eliminar ${item.codigo} del carrito`}
                            title="Eliminar del carrito"
                            className="!px-1.5 !text-zinc-400 hover:!text-red-500"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Columna Derecha: Resumen y Recomendaciones */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          {/* Card Resumen */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/80 space-y-3">
            <h3 className="text-lg font-black text-zinc-700 tracking-wide">RESUMEN</h3>

            <div className="space-y-2 text-xs text-zinc-600">
              <div className="flex justify-between">
                <span>Subtotal ({items.length} items)</span>
                <span className="font-semibold text-zinc-800">S/ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <span>Carreta</span>
                <span className="font-semibold text-zinc-800">S/ {costoCarreta.toFixed(2)}</span>
              </div>
              {/* IGV DESACTIVADO: precios ya incluyen IGV. Reactivar fila al habilitar IGV. */}
              <div className="flex justify-between text-base font-black pt-1 text-zinc-800">
                <span>Total</span>
                <span className="text-brand-primary">S/ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="carreta"
                checked={incluyeCarreta}
                onChange={(e) => setIncluyeCarreta(e.target.checked)}
                className="accent-emerald-600 size-4 cursor-pointer rounded"
              />
              <label htmlFor="carreta" className="text-xs text-emerald-600 font-semibold cursor-pointer">
                Carreta
              </label>
            </div>
            <p className="text-[10px] text-zinc-400">*Carreta precio aproximado S/15</p>

            <Button
              variant="primary"
              disabled={items.length === 0}
              onClick={() => {
                if (items.length === 0) {
                  showToast.error('Agrega al menos un producto al carrito');
                  return;
                }
                useCrearCotizacionStore.getState().hydrateFromCrear({
                  numeroCotizacion,
                  cliente: {
                    id_cliente: idCliente,
                    nombre,
                    telefono,
                    email,
                    tipoDocumento,
                    ruc_dni: rucDni,
                    clienteEditado,
                  },
                  fechaVencimiento,
                  tipoPago,
                  tipoPrecioCliente,
                  items,
                  incluyeCarreta,
                });
                router.push('/admin/cotizaciones/crear/resumen');
              }}
              className="w-full mt-2 !text-xs !rounded-xl"
            >
              Continuar
            </Button>
          </div>

          {/* Panel Recomendaciones IA */}
          <RecomendacionesPanel
            cartItems={items}
            selectedItemId={selectedItemId}
            tipoPrecioCliente={tipoPrecioCliente}
            idCliente={idCliente ?? undefined}
            itemExistenteId={selectedItemId}
            refreshKey={refreshKeyRecs}
            onAgregar={handleAgregarRecomendacion}
            onReemplazar={handleReemplazarRecomendacion}
          />

        </div>
      </div>

      {/* Modal de Agregar Producto */}
      <AgregarProductoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        producto={productoParaModal}
        tipoPrecioCliente={tipoPrecioCliente}
        onAgregar={handleAgregarProducto}
      />

    </div>
  );
}