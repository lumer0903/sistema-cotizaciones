'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { showToast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { useCrearCotizacionStore, ClienteForm } from '@/features/cotizaciones/store/useCrearCotizacionStore';
import { ProductoCarrito, RecomendacionItem } from '@/features/cotizaciones/types/cotizacion';
import { ProductoBase } from '@/features/cotizaciones/components/AgregarProductoModal';
import { TipoRecomendacion } from '@/features/cotizaciones/components/RecomendacionesPanel';
import { obtenerProductosImportados, getProximoNumeroCotizacion } from '@/features/cotizaciones/api/cotizacionApi';
import { formatCode } from '@/lib/formatters';
import { autosaveCotizacion, puedeAutosave } from '@/features/cotizaciones/api/autosave';
import { Cliente } from '@/features/cotizaciones/components/ClienteAutocomplete';

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

/** Contexto del flujo de recomendaciones (null = alta desde el buscador) */
interface ModalRecContexto {
  aviso: string | null;
  cantidadInicial: number;
  precioInicial: number;
  tipoVentaInicial: 'UNIDAD' | 'DOCENA' | 'MAYOR';
  confirmLabel: string;
  observacion: string;
  reemplazaId: string | null;
}

const inferirTipoDoc = (doc: string): 'DNI' | 'CE' | 'RUC' => {
  const d = (doc || '').trim();
  if (/^\d{8}$/.test(d)) return 'DNI';
  if (/^\d{11}$/.test(d)) return 'RUC';
  return 'CE';
};

export function useCotizacionForm(modo: 'crear' | 'editar') {
  const router = useRouter();
  const base = '/cotizaciones';

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

  const [nombre, setNombre] = useState(draftInicial.cliente.nombre);
  const [telefono, setTelefono] = useState(draftInicial.cliente.telefono);
  const [email, setEmail] = useState(draftInicial.cliente.email);
  const [tipoDocumento, setTipoDocumento] = useState<'DNI' | 'CE' | 'RUC'>(draftInicial.cliente.tipoDocumento);
  const [rucDni, setRucDni] = useState(draftInicial.cliente.ruc_dni);
  const [idCliente, setIdCliente] = useState<number | null>(draftInicial.cliente.id_cliente);
  const [clienteEditado, setClienteEditado] = useState(draftInicial.cliente.clienteEditado);
  const [fechaVencimiento, setFechaVencimiento] = useState(draftInicial.fechaVencimiento);
  const [tipoPago, setTipoPago] = useState(draftInicial.tipoPago);

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [productosApi, setProductosApi] = useState<ProductoBase[]>([]);
  const [isLoadingProductos, setIsLoadingProductos] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productoParaModal, setProductoParaModal] = useState<ProductoBase | null>(null);
  const [modalRecContexto, setModalRecContexto] = useState<ModalRecContexto | null>(null);

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

  const resetForm = useCallback(() => {
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
  }, []);

  const handleLimpiar = () => {
    useCrearCotizacionStore.getState().reset();
    resetForm();
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

  const handleSelectProducto = (producto: ProductoBase) => {
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

  /** Precarga el AgregarProductoModal con los datos de la recomendación */
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

  const handleSelectReemplazar = (baseCartId: string, rec: RecomendacionItem, tipo: TipoRecomendacion) => {
    const baseItem = items.find((i) => i.id === baseCartId);
    if (!baseItem) return;
    setModalRecContexto({
      aviso: `Reemplazando ${formatCode(baseItem.codigo)} por ${formatCode(rec.codigo)}`,
      cantidadInicial: baseItem.cantidad,
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

  const clienteForm: ClienteForm = useMemo(
    () => ({ id_cliente: idCliente, nombre, telefono, email, tipoDocumento, ruc_dni: rucDni, clienteEditado }),
    [idCliente, nombre, telefono, email, tipoDocumento, rucDni, clienteEditado],
  );

  const handleContinuar = () => {
    if (items.length === 0) {
      showToast.error('Agrega al menos un producto al carrito');
      return;
    }
    useCrearCotizacionStore.getState().hydrateFromCrear({
      numeroCotizacion,
      cliente: clienteForm,
      fechaVencimiento,
      tipoPago,
      tipoPrecioCliente,
      items,
      incluyeCarreta,
    });
    router.push(`${base}/crear/resumen`);
  };

  return {
    items,
    selectedItemId,
    incluyeCarreta,
    tipoPrecioCliente,
    nombre,
    telefono,
    email,
    tipoDocumento,
    rucDni,
    idCliente,
    clienteEditado,
    fechaVencimiento,
    tipoPago,
    searchQuery,
    showDropdown,
    productosApi,
    isLoadingProductos,
    isModalOpen,
    productoParaModal,
    modalRecContexto,
    refreshKeyRecs,
    numeroCotizacion,
    clienteForm,
    subtotal,
    costoCarreta,
    total,
    searchInputRef,
    setItems,
    setSelectedItemId,
    setIncluyeCarreta,
    setTipoPrecioCliente,
    setNombre,
    setTelefono,
    setEmail,
    setTipoDocumento,
    setRucDni,
    setClienteEditado,
    setFechaVencimiento,
    setTipoPago,
    setSearchQuery,
    setShowDropdown,
    setNumeroCotizacion,
    handleLimpiar,
    handleSelectClienteExistente,
    handleSelectProducto,
    handleCloseModal,
    handleAgregarProducto,
    handleEliminarItem,
    handleAbrirRecomendaciones,
    handleSelectAgregar,
    handleSelectReemplazar,
    handleContinuar,
  };
}
