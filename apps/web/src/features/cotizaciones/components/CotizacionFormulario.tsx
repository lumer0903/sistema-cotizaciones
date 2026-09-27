'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Search,
  ShoppingCart,
  X,
  Loader2,
  FileText,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
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
import { ProductoCarrito, RecomendacionItem } from '@/features/cotizaciones/types/cotizacion';
import AgregarProductoModal, { ProductoBase } from '@/features/cotizaciones/components/AgregarProductoModal';
import { RecomendacionesPanel, TipoRecomendacion } from '@/features/cotizaciones/components/RecomendacionesPanel';
import { obtenerProductosImportados, getProximoNumeroCotizacion } from '@/features/cotizaciones/api/cotizacionApi';
import { formatCode } from '@/lib/formatters';
import { autosaveCotizacion, puedeAutosave } from '@/features/cotizaciones/api/autosave';
import { ClienteAutocomplete, Cliente } from '@/features/cotizaciones/components/ClienteAutocomplete';
import { ResumenCotizacionCard } from '@/features/cotizaciones/components/ResumenCotizacionCard';

/** Borrador vacío para una cotización totalmente nueva */
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

interface CotizacionFormularioProps {
  /** 'crear' = cotización nueva (pide correlativo, ?nueva=1); 'editar' = hidratación desde servidor (autosave en PATCH) */
  modo: 'crear' | 'editar';
}

export function CotizacionFormulario({ modo }: CotizacionFormularioProps) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const base = pathname.startsWith('/vendedor') ? '/vendedor/cotizaciones' : '/admin/cotizaciones';

  const esNueva =
    modo === 'crear' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('nueva') === '1';

  const esCrearNueva = modo === 'crear' && esNueva;

  const draftInicial = useMemo(
    () =>
      esNueva
        ? { ...DRAFT_VACIO_NUEVO, cliente: { ...DRAFT_VACIO_NUEVO.cliente }, items: [] as ProductoCarrito[] }
        : useCrearCotizacionStore.getState(),
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

  const handleSelectClienteExistente = (c: Cliente | null) => {
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

  // Buscador y Catálogo
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [productosApi, setProductosApi] = useState<ProductoBase[]>([]);
  const [isLoadingProductos, setIsLoadingProductos] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modal Agregar Producto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productoParaModal, setProductoParaModal] = useState<ProductoBase | null>(null);
  // Contexto del flujo de recomendaciones (null = alta desde el buscador)
  const [modalRecContexto, setModalRecContexto] = useState<{
    aviso: string | null;
    cantidadInicial: number;
    precioInicial: number;
    tipoVentaInicial: 'UNIDAD' | 'DOCENA' | 'MAYOR';
    confirmLabel: string;
    observacion: string;
    reemplazaId: string | null;
  } | null>(null);

  // Recomendaciones IA
  const [refreshKeyRecs, setRefreshKeyRecs] = useState(0);

  const cartSeqRef = useRef(0);
  const nextCartId = () => {
    cartSeqRef.current += 1;
    return `cart-${Date.now()}-${cartSeqRef.current}-${Math.floor(Math.random() * 1e6)}`;
  };

  const [numeroCotizacion, setNumeroCotizacion] = useState(draftInicial.numeroCotizacion);

  const [prevEsCrearNueva, setPrevEsCrearNueva] = useState<boolean | null>(null);

  if (prevEsCrearNueva !== esCrearNueva) {
    setPrevEsCrearNueva(esCrearNueva);
    if (esCrearNueva) {
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
    }
  }

  useEffect(() => {
    if (!esCrearNueva) return;
    useCrearCotizacionStore.getState().reset();
    router.replace(`${base}/crear`);
  }, [esCrearNueva, router, base]);

  useEffect(() => {
    if (modo !== 'crear' || tieneBorradorPrevio) return;
    getProximoNumeroCotizacion()
      .then((n) => {
        setNumeroCotizacion(n);
        useCrearCotizacionStore.getState().setNumero(n);
      })
      .catch(() => {
        showToast.error('No se pudo obtener el número de cotización');
      });
  }, [tieneBorradorPrevio, modo]);

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

  useEffect(() => {
    const clienteSnap = { id_cliente: idCliente, nombre, telefono, email, tipoDocumento, ruc_dni: rucDni, clienteEditado };
    if (!puedeAutosave(clienteSnap, items)) return;

    const t = window.setTimeout(async () => {
      try {
        const store = useCrearCotizacionStore.getState();
        const idExistente =
          store.idCotizacionGuardada != null && store.numeroGuardado === numeroCotizacion
            ? store.idCotizacionGuardada
            : null;

        const res = await autosaveCotizacion({
          cliente: clienteSnap,
          items,
          tipoPrecioCliente,
          incluyeCarreta,
          costoCarreta: incluyeCarreta ? 15 : 0,
          numero: idExistente == null ? numeroCotizacion : undefined,
          idCotizacionGuardada: idExistente,
          tipoPago,
          fechaVencimiento,
        });
        if (res != null) {
          useCrearCotizacionStore.getState().setCotizacionGuardada(res.idCotizacion, numeroCotizacion);
          // Persistir el id del cliente creado/reutilizado para no duplicarlo en el siguiente guardado
          if (res.idCliente > 0 && res.idCliente !== idCliente) {
            setIdCliente(res.idCliente);
            setClienteEditado(false);
          }
        }
      } catch (e) {
        console.warn('[autosave] No se pudo guardar el borrador en el servidor:', e);
      }
    }, 1800);

    return () => window.clearTimeout(t);
  }, [numeroCotizacion, idCliente, nombre, telefono, email, tipoDocumento, rucDni, clienteEditado, fechaVencimiento, tipoPago, tipoPrecioCliente, items, incluyeCarreta]);

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
    getProximoNumeroCotizacion()
      .then(setNumeroCotizacion)
      .catch(() => showToast.error('No se pudo obtener el número de cotización'));
    showToast.success('Borrador limpio: nueva cotización');
  };

  const fetchProductos = useCallback(async () => {
    try {
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
    const run = async () => {
      await fetchProductos();
    };
    void run();
  }, [fetchProductos]);

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

  const handleSeleccionarProducto = (producto: ProductoBase) => {
    setProductoParaModal(producto);
    setIsModalOpen(true);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setProductoParaModal(null);
    setModalRecContexto(null);
  };

  const handleAgregarProducto = (nuevoItem: ProductoCarrito) => {
    const id = nextCartId();
    const itemFinal: ProductoCarrito = modalRecContexto
      ? { ...nuevoItem, id, es_sugerido_ia: true, observacion: modalRecContexto.observacion }
      : { ...nuevoItem, id };

    if (modalRecContexto?.reemplazaId) {
      const reemplazaId = modalRecContexto.reemplazaId;
      setItems((prev) => [...prev.filter((i) => i.id !== reemplazaId), itemFinal]);
      showToast.success('Producto reemplazado en el carrito');
    } else {
      setItems((prev) => [...prev, itemFinal]);
      if (modalRecContexto) showToast.success('Producto agregado al carrito');
    }

    setSelectedItemId(id);
    handleCloseModal();
  };

  const handleEliminarItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const handleAbrirRecomendaciones = (itemId: string) => {
    setSelectedItemId(itemId);
    setRefreshKeyRecs((k) => k + 1);
  };

  /** Precarga el AgregarProductoModal con los datos de la recomendación (imagen, stock, estante, precios del catálogo) */
  const mapRecToProductoBase = (rec: RecomendacionItem): ProductoBase => {
    const catalogo = productosApi.find(
      (p) => Number(p.id_producto ?? p.id) === Number(rec.id_producto)
    );
    const stock = Number(rec.stock ?? 0);
    return {
      id: rec.id_producto,
      id_producto: rec.id_producto,
      codigo: rec.codigo,
      descripcion: rec.descripcion,
      foto_url: rec.imagen_url ?? catalogo?.foto_url ?? null,
      imagenUrl: catalogo?.imagenUrl ?? null,
      estante: rec.ubicacion ?? catalogo?.estante,
      stock,
      stock_total: stock,
      stockTotal: stock,
      stock_minimo: catalogo?.stock_minimo ?? catalogo?.stockAlerta,
      stockAlerta: catalogo?.stockAlerta,
      almacen: { nombre: rec.almacen ?? null, ubicacion: rec.ubicacion ?? null },
      precios: catalogo?.precios,
      coloresDisponibles: catalogo?.coloresDisponibles,
      colores_surtido: catalogo?.colores_surtido,
      unidades_por_caja: rec.unidades_por_caja ?? catalogo?.unidades_por_caja,
      presentacion: catalogo?.presentacion,
    };
  };

  /** AGREGAR desde el panel → modal de confirmación con cantidad 1 y precio de la recomendación */
  const handleSelectAgregar = (rec: RecomendacionItem, tipo: TipoRecomendacion) => {
    setModalRecContexto({
      aviso: null,
      cantidadInicial: 1,
      precioInicial: Number(rec.precio ?? 0),
      tipoVentaInicial: 'UNIDAD',
      confirmLabel: 'Agregar',
      observacion: `Sugerido por IA (${tipo.toUpperCase()})`,
      reemplazaId: null,
    });
    setProductoParaModal(mapRecToProductoBase(rec));
    setIsModalOpen(true);
  };

  /** REEMPLAZAR desde el panel → modal con la cantidad del producto base y aviso de reemplazo */
  const handleSelectReemplazar = (baseCartId: string, rec: RecomendacionItem, tipo: TipoRecomendacion) => {
    const base = items.find((i) => i.id === baseCartId);
    if (!base) return;
    setModalRecContexto({
      aviso: `Reemplazando ${formatCode(base.codigo)} por ${formatCode(rec.codigo)}`,
      cantidadInicial: base.cantidad,
      precioInicial: Number(rec.precio ?? 0),
      tipoVentaInicial: 'UNIDAD',
      confirmLabel: 'Reemplazar',
      observacion: `Reemplazado por IA (${tipo.toUpperCase()})`,
      reemplazaId: baseCartId,
    });
    setProductoParaModal(mapRecToProductoBase(rec));
    setIsModalOpen(true);
  };

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.total, 0), [items]);
  const costoCarreta = incluyeCarreta ? 15.00 : 0.00;
  const total = subtotal + costoCarreta;

  // Helper para manejar valores de Select sea evento u objeto directo
  const getSelectValue = (e: any) => (e && e.target ? e.target.value : e);

  const handleContinuar = () => {
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
    router.push(`${base}/crear/resumen`);
  };

  return (
      <div className="w-full max-w-[1700px] mx-auto space-y-6 font-['DM_Sans']">

      {/* Encabezado */}
      <div className="flex flex-wrap justify-between items-center w-full gap-2 px-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href={base}
            aria-label="Volver al listado de cotizaciones"
            className="inline-flex items-center gap-1.5 min-h-11 min-w-11 justify-center px-2 -ml-2 rounded-lg text-sm font-semibold text-brand-ink hover:bg-brand-soft transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span className="hidden sm:inline">Volver</span>
          </Link>
          <FileText className="w-5 h-5 text-brand-ink" aria-hidden="true" />
          <span className="text-xl font-black text-zinc-700 tracking-tight truncate">
            {numeroCotizacion}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          <Badge size="estado" variant="borrador">
            BORRADOR
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* Columna Izquierda: Formulario y Carrito */}
        <div className="col-span-12 lg:col-span-8 min-w-0 space-y-6">

          {/* Formulario Información General */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/80 space-y-4">
            <h2 className="text-lg font-bold text-zinc-700 mb-2">Información general</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <ClienteAutocomplete
                value={nombre}
                variant="modal"
                onChange={(v) => {
                  setNombre(v);
                  if (idCliente) setClienteEditado(true);
                }}
                onSelectCliente={handleSelectClienteExistente}
              />
              <Select
                label="Tipo de precio"
                variant="modal"
                value={tipoPrecioCliente}
                onChange={(e) => setTipoPrecioCliente(getSelectValue(e) as 'DISTRIBUIDOR' | 'TIENDA')}
                options={[
                  { label: 'Distribuidor', value: 'DISTRIBUIDOR' },
                  { label: 'Tienda', value: 'TIENDA' },
                ]}
              />
              <Input
                label="Teléfono"
                variant="modal"
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
                variant="modal"
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
                variant="modal"
                value={tipoDocumento}
                onChange={(e) => {
                  const v = String(getSelectValue(e)) as 'DNI' | 'CE' | 'RUC';
                  setTipoDocumento(v);
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
                variant="modal"
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
                variant="modal"
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
              />
              <Select
                label="Tipo de pago"
                variant="modal"
                value={tipoPago}
                onChange={(e) => setTipoPago(String(getSelectValue(e)))}
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

            <div className="relative">
              <div className="relative">
                <Input
                  ref={searchInputRef}
                  placeholder="Escribe el código o nombre del producto (ej: RY-)..."
                  icon={
                    isLoadingProductos ? (
                      <Loader2 className="size-4 animate-spin text-brand-ink" />
                    ) : (
                      <Search className="size-4 text-brand-ink" />
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

              {showDropdown && searchQuery.trim() !== '' && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y divide-zinc-100">
                    {resultadosBusqueda.length > 0 ? (
                      resultadosBusqueda.map((prod, index) => (
                        <div
                          key={prod.id || prod.codigo || index}
                          onClick={() => handleSeleccionarProducto(prod)}
                          className="p-3 hover:bg-brand-soft/60 cursor-pointer transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-xs bg-stone-100 px-2 py-1 rounded text-zinc-700 border border-stone-200 uppercase">
                              {String(prod.codigo).toUpperCase()}
                            </span>
                            <div>
                              <p className="text-xs font-medium text-zinc-700 leading-tight">
                                {prod.descripcion}
                              </p>
                              <p className="text-xs text-zinc-500 mt-0.5">
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
                      <div className="p-4 text-center text-xs text-zinc-500">
                        {isLoadingProductos
                          ? 'Cargando catálogo...'
                          : `No se encontraron productos importados con "${searchQuery}"`}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {items.length === 0 ? (
              <div
                onClick={() => searchInputRef.current?.focus()}
                className="h-44 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col justify-center items-center gap-2 cursor-pointer hover:bg-stone-50/80 transition-colors"
              >
                <ShoppingCart className="size-8 text-zinc-300" />
                <span className="text-zinc-500 font-medium text-xs">
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
                      className={selectedItemId === item.id ? 'bg-brand-soft/60' : ''}
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
                            aria-label={`Ver recomendaciones IA de ${item.codigo}`}
                            title="Ver recomendaciones IA"
                            className={`!px-1.5 ${selectedItemId === item.id
                              ? '!bg-brand-selection !text-brand-ink outline outline-1 outline-offset-[-1px] outline-brand-modalFocus'
                              : '!text-zinc-500 hover:!text-brand-ink'
                              }`}
                          >
                            <Sparkles className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleEliminarItem(item.id)}
                            aria-label={`Eliminar ${item.codigo} del carrito`}
                            title="Eliminar del carrito"
                            className="!px-1.5 !text-zinc-500 hover:!text-red-500"
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

          {/* Card Resumen (diseño Figma) */}
          <ResumenCotizacionCard
            itemsCount={items.length}
            subtotal={subtotal}
            incluyeCarreta={incluyeCarreta}
            costoCarreta={costoCarreta}
            total={total}
            onToggleCarreta={setIncluyeCarreta}
            continuarDisabled={items.length === 0}
            onContinuar={handleContinuar}
          />

          <RecomendacionesPanel
            cartItems={items}
            selectedItemId={selectedItemId}
            tipoPrecioCliente={tipoPrecioCliente}
            idCliente={idCliente ?? undefined}
            itemExistenteId={selectedItemId}
            refreshKey={refreshKeyRecs}
            productosCatalogo={productosApi}
            onSelectAgregar={handleSelectAgregar}
            onSelectReemplazar={handleSelectReemplazar}
          />
        </div>
      </div>

      <AgregarProductoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        producto={productoParaModal}
        tipoPrecioCliente={tipoPrecioCliente}
        onAgregar={handleAgregarProducto}
        cantidadInicial={modalRecContexto?.cantidadInicial}
        precioInicial={modalRecContexto?.precioInicial}
        tipoVentaInicial={modalRecContexto?.tipoVentaInicial}
        aviso={modalRecContexto?.aviso}
        confirmLabel={modalRecContexto?.confirmLabel}
      />
    </div>
  );
}
