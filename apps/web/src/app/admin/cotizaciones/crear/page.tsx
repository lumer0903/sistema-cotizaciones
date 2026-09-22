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
import { toast } from 'sonner';

import {
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';
import { ProductoCarrito } from '@/features/cotizaciones/types/cotizacion';
import AgregarProductoModal, { ProductoBase } from '@/features/cotizaciones/components/AgregarProductoModal';
import { RecomendacionesPanel } from '@/features/cotizaciones/components/RecomendacionesPanel';
import { obtenerProductosImportados } from '@/features/cotizaciones/api/cotizacionApi';

export default function CrearCotizacionPage() {
  const [items, setItems] = useState<ProductoCarrito[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [incluyeCarreta, setIncluyeCarreta] = useState(false);
  const [tipoPrecioCliente, setTipoPrecioCliente] = useState<'DISTRIBUIDOR' | 'TIENDA'>('DISTRIBUIDOR');

  // Formulario Información General
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [numIdentificacion, setNumIdentificacion] = useState('');
  const [ruc, setRuc] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [tipoPago, setTipoPago] = useState('');

  // Estados del Buscador y Productos de API
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [productosApi, setProductosApi] = useState<ProductoBase[]>([]);
  const [isLoadingProductos, setIsLoadingProductos] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Estados para el Modal Agregar Producto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productoParaModal, setProductoParaModal] = useState<ProductoBase | null>(null);

  // Estados para Recomendaciones IA
  const [isRecomendacionesOpen, setIsRecomendacionesOpen] = useState(false);
  const [productoParaRecomendaciones, setProductoParaRecomendaciones] = useState<{ id: number; codigo: string; descripcion: string } | null>(null);
  const [itemExistenteId, setItemExistenteId] = useState<string | null>(null);

  // Cargar productos desde la API al montar
  const fetchProductos = useCallback(async () => {
    try {
      setIsLoadingProductos(true);
      const data = await obtenerProductosImportados();
      setProductosApi(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al obtener productos de la API:', error);
      toast.error('No se pudieron cargar los productos del catálogo');
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

  // Agregar item al carrito
  const handleAgregarProducto = (nuevoItem: ProductoCarrito) => {
    setItems((prev) => [...prev, { ...nuevoItem, id: Date.now().toString() }]);
  };

  // Eliminar item del carrito
  const handleEliminarItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  // Manejar apertura de recomendaciones
  const handleAbrirRecomendaciones = (itemId: string, item: ProductoCarrito) => {
    setSelectedItemId(itemId);
    setItemExistenteId(itemId);
    setProductoParaRecomendaciones({ id: Number(item.id), codigo: item.codigo, descripcion: item.descripcion });
    setIsRecomendacionesOpen(true);
  };

  // Manejar agregar recomendación al carrito
  const handleAgregarRecomendacion = (item: any, tipo: 'similar' | 'upsell' | 'equilibrio') => {
    const nuevoItem: ProductoCarrito = {
      id: Date.now().toString(),
      codigo: item.codigo,
      descripcion: item.descripcion,
      precioUnitario: item.precio,
      cantidad: 1,
      total: item.precio,
      observacion: `Sugerido por IA (${tipo.toUpperCase()})`,
      es_sugerido_ia: true,
    };
    setItems((prev) => [...prev, nuevoItem]);
    setIsRecomendacionesOpen(false);
    setProductoParaRecomendaciones(null);
    setSelectedItemId(null);
    setItemExistenteId(null);
  };

  // Manejar reemplazar item por recomendación
  const handleReemplazarRecomendacion = (itemExistenteId: string, nuevoItem: any, tipo: 'similar' | 'upsell' | 'equilibrio') => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemExistenteId
          ? {
              ...item,
              codigo: nuevoItem.codigo,
              descripcion: nuevoItem.descripcion,
              precioUnitario: nuevoItem.precio,
              total: nuevoItem.precio * item.cantidad,
              observacion: `Reemplazado por IA (${tipo.toUpperCase()})`,
              es_sugerido_ia: true,
            }
          : item
      )
    );
    setIsRecomendacionesOpen(false);
    setProductoParaRecomendaciones(null);
    setSelectedItemId(null);
    setItemExistenteId(null);
  };

  // Cálculos de montos
  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.total, 0), [items]);
  const costoCarreta = incluyeCarreta ? 15.00 : 0.00;
  const igv = useMemo(() => (subtotal + costoCarreta) * 0.18, [subtotal, costoCarreta]);
  const total = subtotal + costoCarreta + igv;

  return (
    <div className="p-0 md:p-0 w-full max-w-[1700px] mx-auto space-y-6 font-['DM_Sans']">

      {/* Encabezado */}
      <div className="flex justify-between items-center w-full px-1">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-brand-primary" />
          <span className="text-xl font-black text-zinc-700 tracking-tight">
            COT-190626
          </span>
        </div>

        <span className="bg-neutral-100 text-neutral-600 font-bold px-3 py-1 rounded-lg text-xs border border-zinc-300 shadow-sm uppercase tracking-wider">
          BORRADOR
        </span>
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* Columna Izquierda: Formulario y Carrito */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* Formulario Información General */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/80 space-y-4">
            <h2 className="text-lg font-bold text-zinc-700 mb-2">Información general</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Input
                label="Nombre"
                placeholder="Nombre del cliente"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
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
                onChange={(e) => setTelefono(e.target.value)}
              />

              <Input
                label="Email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Select
                label="Tipo de Documento"
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(String(e.target.value))}
                options={[
                  { label: 'DNI', value: 'DNI' },
                  { label: 'CE', value: 'CE' },
                ]}
              />
              <Input
                label="N° de identificación"
                placeholder="Número de doc."
                value={numIdentificacion}
                onChange={(e) => setNumIdentificacion(e.target.value)}
              />

              <Input
                label="RUC"
                placeholder="Número de RUC"
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
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
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setShowDropdown(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="size-4" />
                  </button>
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
                            <span className="font-bold text-xs bg-stone-100 px-2 py-1 rounded text-zinc-700 border border-stone-200">
                              {prod.codigo}
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
                          <button
                            type="button"
                            className="bg-brand-primary hover:bg-brand-hover text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors shrink-0"
                          >
                            Seleccionar
                          </button>
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
                          <button
                            type="button"
                            onClick={() => setSelectedItemId(item.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${selectedItemId === item.id
                                ? 'border-brand-modalFocus bg-brand-selection text-brand-primary'
                                : 'border-zinc-200 text-zinc-400 hover:text-brand-primary'
                              }`}
                            title="Ver sugerencias"
                          >
                            <MessageSquare className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminarItem(item.id)}
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:text-red-500 transition-colors"
                            title="Eliminar del carrito"
                          >
                            <Trash2 className="size-4" />
                          </button>
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
              <div className="flex justify-between">
                <span>Carreta</span>
                <span className="font-semibold text-zinc-800">S/ {costoCarreta.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <span>IGV (18%)</span>
                <span className="font-semibold text-zinc-800">S/ {igv.toFixed(2)}</span>
              </div>
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

            <button
              type="button"
              className="w-full bg-brand-primary hover:bg-brand-hover text-white font-bold h-10 rounded-xl mt-2 transition-colors text-xs shadow-sm"
            >
              Continuar
            </button>
          </div>

          {/* Panel Recomendaciones */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/80">
            <h3 className="text-base font-bold text-zinc-700 mb-3">RECOMENDACIONES</h3>

            {!selectedItemId ? (
              <div className="text-center py-10 text-zinc-400 space-y-2">
                <MessageSquare className="size-7 mx-auto text-brand-primary opacity-80" />
                <p className="text-xs font-medium">Haz clic en el icono de mensaje de un producto para ver sugerencias</p>
              </div>
            ) : null}
          </div>

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

      {/* Modal de Recomendaciones IA */}
      <RecomendacionesPanel
        isOpen={isRecomendacionesOpen}
        onClose={() => { setIsRecomendacionesOpen(false); setProductoParaRecomendaciones(null); setSelectedItemId(null); setItemExistenteId(null); }}
        productoBase={productoParaRecomendaciones}
        tipoPrecioCliente={tipoPrecioCliente}
        onAgregar={handleAgregarRecomendacion}
        onReemplazar={handleReemplazarRecomendacion}
        itemExistenteId={itemExistenteId}
      />
    </div>
  );
}