import { useCallback, useEffect, useState } from 'react';
import { Bot, Download, Edit3, FileDown, Search, Trash2, Sparkles, Check, ChevronDown, Eye, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient, apiJson } from '../../infrastructure/http/apiClient';
import { AppLayout } from '../components/AppLayout';
import { Modal } from '../components/Modal';
import { ProductImage } from '../components/ProductImage';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { money } from '../utils/format';

const stateOptions = {
  borrador: [['borrador', 'Borrador'], ['enviada', 'Enviado']],
  enviada: [['enviada', 'Enviado'], ['aprobada', 'Aceptado'], ['rechazada', 'Rechazado']],
  aprobada: [['aprobada', 'Aceptado']],
  rechazada: [['rechazada', 'Rechazado']]
};

const stateStyles = {
  borrador: 'bg-neutral-100 text-[#414141] border-[#d9d9d9]/50',
  enviada: 'bg-blue-50 text-blue-750 border-blue-150/40',
  aprobada: 'bg-emerald-50 text-emerald-700 border-emerald-150/40',
  rechazada: 'bg-red-50 text-red-650 border-red-150/40'
};

const badgeRecomenda = {
  'Mayor similitud': 'bg-blue-50 text-blue-755 border-blue-100/40',
  'Mas economico': 'bg-emerald-50 text-emerald-700 border-emerald-100/40',
  'Mejor opcion': 'bg-purple-50 text-purple-755 border-purple-100/40'
};

export function QuoteDetailPage() {
  const id = new URLSearchParams(location.search).get('id');
  const [quote, setQuote] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [modal, setModal] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [recommendationDetail, setRecommendationDetail] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [error, setError] = useState('');
  const [activeIaProduct, setActiveIaProduct] = useState(null);
  
  const debounced = useDebouncedValue(query, 250);

  const load = useCallback(() => {
    if (!id) return setError('Cotización no especificada.');
    apiJson(`/api/cotizaciones/${id}`)
      .then(setQuote)
      .catch(requestError => setError(requestError.message));
  }, [id]);

  useEffect(load, [load]);

  useEffect(() => {
    if (debounced.trim().length < 2) return setResults([]);
    apiJson(`/api/cotizaciones/${id}/buscar-productos?q=${encodeURIComponent(debounced.trim())}`)
      .then(setResults)
      .catch(requestError => setError(requestError.message));
  }, [debounced, id]);

  const final = ['enviada', 'aprobada'].includes(quote?.estado);
  const terminal = ['aprobada', 'rechazada'].includes(quote?.estado);

  const getPrice = useCallback((product, type) => {
    const suffix = quote?.tipo_precio === 'distribuidor' ? 'dist' : 'normal';
    return Number(product[`precio_${type}_${suffix}`] || product[`precio_${type}`] || product.precio_unitario || 0);
  }, [quote]);

  useEffect(() => {
    if (!final) return undefined;
    let url;
    apiClient(`/api/cotizaciones/${id}/pdf`)
      .then(async response => {
        if (!response.ok) throw new Error('No se pudo cargar el PDF.');
        url = URL.createObjectURL(await response.blob());
        setPdfUrl(url);
      })
      .catch(requestError => setError(requestError.message));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [final, id]);

  function openProduct(product, detail = null) {
    const type = detail?.tipo_venta || 'unidad';
    const replaced = detail && Number(detail.id_producto) !== Number(product.id_producto);
    setModal({
      product,
      detail,
      tipo_venta: type,
      cantidad: detail?.cantidad || (type === 'docena' ? 12 : type === 'mayor' ? 13 : 1),
      precio: !replaced && detail?.precio_unitario ? Number(detail.precio_unitario) : getPrice(product, type)
    });
  }

  function changeType(type) {
    setModal(current => ({
      ...current,
      tipo_venta: type,
      cantidad: type === 'docena' ? 12 : type === 'mayor' ? 13 : 1,
      precio: getPrice(current.product, type)
    }));
  }

  function changeQuantity(quantity) {
    const type = quantity > 12 ? 'mayor' : quantity === 12 ? 'docena' : 'unidad';
    setModal(current => ({
      ...current,
      cantidad: quantity,
      tipo_venta: type,
      precio: current.tipo_venta === type ? current.precio : getPrice(current.product, type)
    }));
  }

  async function saveProduct() {
    const path = modal.detail ? `/api/cotizaciones/${id}/detalle/${modal.detail.id_detalle}` : `/api/cotizaciones/${id}/detalle`;
    const payload = await apiJson(path, {
      method: modal.detail ? 'PUT' : 'POST',
      body: JSON.stringify({
        id_producto: modal.product.id_producto,
        tipo_venta: modal.tipo_venta,
        cantidad: Number(modal.cantidad),
        es_sugerido_ia: modal.product.es_sugerido_ia || false
      })
    });
    setQuote(payload);
    setModal(null);
  }

  async function remove(detailId) {
    const payload = await apiJson(`/api/cotizaciones/${id}/detalle/${detailId}`, { method: 'DELETE' });
    setQuote(payload);
  }

  async function loadRecommendations(detail) {
    setRecommendationDetail(detail);
    setActiveIaProduct(detail.id_producto);
    setRecommendations(null);
    try {
      const data = await apiJson(`/api/cotizaciones/${id}/recomendaciones/${detail.id_producto}`);
      setRecommendations(data);
    } catch (requestError) {
      setRecommendations([]);
      setError(requestError.message);
    }
  }

  async function updateState(state) {
    try {
      await apiJson(`/api/cotizaciones/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado: state })
      });
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function updateCart(checked) {
    try {
      const payload = await apiJson(`/api/cotizaciones/${id}/carreta`, {
        method: 'PUT',
        body: JSON.stringify({ incluye_carreta: checked, costo_carreta: Number(quote.costo_carreta || 15) })
      });
      setQuote(payload);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveObservations(value) {
    try {
      await apiJson(`/api/cotizaciones/${id}/observaciones`, {
        method: 'PUT',
        body: JSON.stringify({ observaciones: value })
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function downloadPdf() {
    const response = await apiClient(`/api/cotizaciones/${id}/pdf`);
    if (!response.ok) throw new Error('No se pudo generar el PDF.');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `${quote.numero}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!quote) {
    return (
      <AppLayout title="Detalle de cotización">
        <div className="text-center text-xs text-neutral-400 py-12">
          {error || 'Cargando cotización...'}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Detalle de cotización">
      <div className="space-y-6 select-none animate-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#d9d9d9] pb-6">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-[#414141] tracking-tight">
              {quote.numero}
            </span>
            <div className="relative">
              <select
                value={quote.estado}
                disabled={terminal}
                onChange={event => updateState(event.target.value)}
                className={`
                  block rounded-full px-3 py-1 text-[10px] font-bold border outline-none appearance-none pr-8 cursor-pointer
                  ${stateStyles[quote.estado] || 'bg-neutral-100 text-neutral-600'}
                  disabled:cursor-not-allowed
                `}
              >
                {(stateOptions[quote.estado] || stateOptions.borrador).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {!terminal && (
                <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-neutral-400">
                  <ChevronDown className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>
          {!final && quote.estado !== 'rechazada' && (
            <button
              onClick={() => downloadPdf().catch(requestError => setError(requestError.message))}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d9d9d9] bg-white px-4 py-2 text-xs font-semibold text-[#414141] hover:bg-[#fdf2f2] hover:text-[#7b1c1c] transition-all shadow-2xs hover:shadow-xs"
            >
              <FileDown className="h-3.5 w-3.5 text-neutral-500" />
              <span>Exportar borrador PDF</span>
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-[#7b1c1c] bg-red-50/50 p-4 text-xs font-semibold text-[#7b1c1c]">
            {error}
          </div>
        )}

        {final ? (
          <section className="rounded-2xl border border-[#d9d9d9] bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#d9d9d9] p-5 bg-[#f8fafc]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#7b1c1c] flex items-center justify-center text-white font-bold text-xs">
                  G
                </div>
                <div>
                  <h2 className="text-xs font-bold text-[#414141]">Documento de cotización</h2>
                  <p className="text-[10px] text-neutral-455 mt-0.5">El documento está listo para ser enviado</p>
                </div>
              </div>
              <button
                onClick={() => downloadPdf().catch(requestError => setError(requestError.message))}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7b1c1c] px-4 py-2 text-xs font-bold text-white hover:bg-[#601414] transition-all shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Descargar PDF</span>
              </button>
            </div>
            {pdfUrl && (
              <iframe
                src={pdfUrl}
                title="PDF de cotización"
                className="w-full h-[640px] border-0"
              />
            )}
          </section>
        ) : quote.estado === 'rechazada' ? (
          <div className="text-center text-xs text-neutral-400 py-12">
            Esta cotización ha sido catalogada como rechazada y ya no permite modificaciones.
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <div className="bg-white border border-[#d9d9d9] rounded-2xl p-5 shadow-xs space-y-4">
                <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase block">
                  Agregar producto al carrito
                </span>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Escribe el código del producto para buscar..."
                    className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 pl-9 pr-4 text-xs placeholder-neutral-450 focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                  />
                </div>

                {results.length > 0 && (
                  <div className="border border-[#d9d9d9] rounded-xl divide-y divide-[#d9d9d9]/40 max-h-60 overflow-y-auto bg-white shadow-2xs animate-in">
                    {results.map(product => (
                      <button
                        key={product.id_producto}
                        onClick={() => openProduct(product)}
                        className="w-full flex items-center justify-between p-3.5 text-left hover:bg-[#f8fafc] transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-4">
                          <strong className="text-xs font-semibold text-[#414141] block">{product.codigo}</strong>
                          <p className="text-[10px] text-neutral-400 truncate mt-0.5">{product.descripcion}</p>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-3">
                          <span className="text-[10px] font-bold text-neutral-500">
                            Unidad: {money(product.precio_unidad)}
                          </span>
                          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[9px] font-bold text-neutral-600">
                            Stock: {product.stock_total}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase block">
                  Artículos de la Cotización
                </span>

                <div className="overflow-hidden rounded-2xl border border-[#d9d9d9] bg-white shadow-xs">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-[#d9d9d9] bg-[#f8fafc]">
                          <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[70px]">Imagen</th>
                          <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Detalle</th>
                          <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[110px]">Cantidad</th>
                          <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[110px]">Subtotal</th>
                          <th className="px-6 py-4 text-right text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[210px]">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#d9d9d9]/40">
                        {quote.detalle.length ? (
                          quote.detalle.map(detail => {
                            const isIaActive = activeIaProduct === detail.id_producto;
                            return (
                              <tr key={detail.id_detalle} className="hover:bg-[#f8fafc]/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#d9d9d9] bg-[#f8fafc] flex items-center justify-center">
                                    <ProductImage product={detail} className="h-full w-full object-cover" />
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="min-w-0">
                                    <strong className="text-xs font-semibold text-[#414141] block">{detail.codigo}</strong>
                                    <p className="text-[10px] text-neutral-400 truncate mt-0.5 leading-relaxed">{detail.descripcion}</p>
                                    
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                      <span className="inline-flex items-center rounded bg-[#f8fafc] px-1.5 py-0.5 text-[9px] font-bold text-neutral-500 uppercase border">
                                        Precio: {money(detail.precio_unitario)}
                                      </span>
                                      {detail.es_sugerido_ia && (
                                        <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold text-purple-755 border border-purple-100/50">
                                          <Sparkles className="h-2.5 w-2.5" />
                                          <span>Sugerido IA</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-xs font-medium text-[#414141]">
                                    {detail.cantidad} {detail.tipo_venta === 'docena' ? 'doc.' : detail.tipo_venta === 'mayor' ? 'may.' : 'un.'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-xs font-semibold text-[#414141]">
                                    {money(detail.subtotal)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="inline-flex gap-2">
                                    <button
                                      onClick={() => loadRecommendations(detail)}
                                      className={`
                                        inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-all shadow-2xs
                                        ${isIaActive 
                                          ? 'border-purple-200 bg-purple-50 text-purple-755 hover:bg-purple-100/50' 
                                          : 'border-[#d9d9d9] bg-white text-[#414141] hover:bg-purple-50 hover:text-purple-755 hover:border-purple-200'}
                                      `}
                                    >
                                      <Sparkles className="h-3 w-3" />
                                      <span>IA</span>
                                    </button>
                                    <button
                                      onClick={() => openProduct(detail, detail)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-[#d9d9d9] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#414141] hover:bg-[#fdf2f2] hover:text-[#7b1c1c] shadow-2xs transition-all"
                                    >
                                      <Edit3 className="h-3 w-3 text-neutral-400" />
                                      <span>Editar</span>
                                    </button>
                                    <button
                                      onClick={() => remove(detail.id_detalle).catch(requestError => setError(requestError.message))}
                                      className="inline-flex items-center gap-1 rounded-lg border border-[#d9d9d9] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#7b1c1c] hover:bg-red-50 shadow-2xs transition-all"
                                    >
                                      <Trash2 className="h-3 w-3 text-[#7b1c1c]" />
                                      <span>Eliminar</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-12 text-center text-xs text-neutral-400">
                              Agrega productos utilizando el buscador de arriba.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="bg-white border border-[#d9d9d9] rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#d9d9d9] pb-3">
                  <Sparkles className="h-4 w-4 text-purple-650" />
                  <span className="text-xs font-bold text-[#414141] tracking-tight">Recomendaciones IA</span>
                </div>

                <div className="space-y-4 min-h-[140px] flex flex-col justify-center">
                  {recommendations === null ? (
                    <div className="text-center py-6 text-xs text-neutral-400">
                      Presiona el botón de "IA" en un artículo para cargar alternativas
                    </div>
                  ) : recommendations.length ? (
                    <div className="space-y-3.5">
                      {recommendations.map((rec, index) => (
                        <div key={index} className="flex gap-3.5 border border-[#d9d9d9] rounded-xl p-3.5 bg-[#f8fafc] hover:border-[#7b1c1c] transition-colors">
                          <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#d9d9d9] bg-[#f8fafc] shrink-0 flex items-center justify-center">
                            <ProductImage product={rec.producto} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between">
                              <span className={`
                                px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border tracking-wider
                                ${badgeRecomenda[rec.tipo] || 'bg-neutral-100 text-neutral-600 border-[#d9d9d9]/50'}
                              `}>
                                {rec.tipo === 'Mas economico' ? 'Más económico' : rec.tipo === 'Mejor opcion' ? 'Mejor opción' : rec.tipo}
                              </span>
                              <span className="text-[10px] font-semibold text-[#414141]">
                                {money(rec.producto.precio_referencia)}
                              </span>
                            </div>
                            <strong className="text-xs font-bold text-[#414141] block mt-1.5">{rec.producto.codigo}</strong>
                            <p className="text-[9px] text-neutral-400 truncate mt-0.5 leading-relaxed">{rec.producto.descripcion}</p>

                            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#d9d9d9]">
                              <button
                                onClick={() => openProduct({ ...rec.producto, es_sugerido_ia: true })}
                                className="text-[9px] font-bold text-[#414141] hover:text-[#7b1c1c] py-1 px-2 rounded-md hover:bg-[#fdf2f2] transition-colors"
                              >
                                Agregar
                              </button>
                              <button
                                onClick={() => openProduct({ ...rec.producto, es_sugerido_ia: true }, recommendationDetail)}
                                className="text-[9px] font-bold text-purple-755 hover:text-purple-900 py-1 px-2 rounded-md hover:bg-purple-100/50 transition-colors"
                              >
                                Reemplazar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-neutral-400">
                      No se encontraron recomendaciones aplicables.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-[#d9d9d9] rounded-2xl p-5 shadow-xs space-y-4">
                <span className="text-xs font-bold text-[#414141] tracking-tight block border-b border-[#d9d9d9] pb-3">
                  Resumen de la orden
                </span>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between gap-4 py-1.5 border-b border-[#d9d9d9]/40">
                    <span className="text-neutral-400">Cliente</span>
                    <strong className="font-semibold text-[#414141] truncate max-w-[160px]">
                      {quote.cliente_nombre || '-'}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5 border-b border-[#d9d9d9]/40">
                    <span className="text-neutral-400">Contacto</span>
                    <strong className="font-semibold text-[#414141] truncate max-w-[160px]">
                      {quote.email || '-'}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5 border-b border-[#d9d9d9]/40">
                    <span className="text-neutral-400">DNI/RUC</span>
                    <strong className="font-semibold text-[#414141]">
                      {quote.ruc_dni || '-'}
                    </strong>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase block">
                      Observaciones
                    </span>
                    <textarea
                      defaultValue={quote.observaciones || ''}
                      onBlur={event => saveObservations(event.target.value)}
                      placeholder="Sin observaciones..."
                      className="block w-full rounded-xl border border-[#d9d9d9] p-3 text-xs focus:border-[#7b1c1c] transition-all outline-none min-h-[64px]"
                    />
                  </div>

                  <div className="flex items-center justify-between border-y border-[#d9d9d9] py-3.5 my-4 bg-[#f8fafc] px-3 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-neutral-700">
                      <input
                        type="checkbox"
                        checked={Boolean(Number(quote.incluye_carreta))}
                        onChange={event => updateCart(event.target.checked)}
                        className="h-4 w-4 rounded border-[#d9d9d9] text-[#7b1c1c] focus:ring-[#7b1c1c] cursor-pointer"
                      />
                      <span>Incluir embalaje</span>
                    </label>
                    <span className="font-semibold text-[#414141]">
                      {money(quote.costo_carreta || 15)}
                    </span>
                  </div>

                  <div className="flex items-end justify-between pt-2">
                    <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Total a cotizar</span>
                    <strong className="text-xl font-bold tracking-tight text-[#414141] leading-none">
                      {money(quote.total)}
                    </strong>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(modal)}
        title={modal?.detail ? 'Editar artículo' : 'Agregar artículo'}
        onClose={() => setModal(null)}
        footer={(
          <div className="flex justify-end gap-3 w-full">
            <button
              className="rounded-xl border border-[#d9d9d9] bg-white px-4 py-2 text-xs font-semibold text-[#414141] hover:bg-[#f8fafc] transition-all shadow-2xs"
              onClick={() => setModal(null)}
            >
              Cancelar
            </button>
            <button
              className="rounded-xl bg-[#7b1c1c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#601414] transition-all shadow-xs"
              onClick={() => saveProduct().catch(requestError => setError(requestError.message))}
            >
              Confirmar
            </button>
          </div>
        )}
      >
        {modal && (
          <div className="space-y-5">
            <div className="flex gap-4 items-start border-b border-[#d9d9d9] pb-4">
              <div className="h-14 w-14 rounded-xl overflow-hidden border border-[#d9d9d9] bg-[#f8fafc] shrink-0 flex items-center justify-center">
                <ProductImage product={modal.product} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <strong className="text-xs font-semibold text-[#414141] block">{modal.product.codigo}</strong>
                <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">{modal.product.descripcion}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Tipo de venta
                </label>
                <div className="relative">
                  <select
                    value={modal.tipo_venta}
                    onChange={event => changeType(event.target.value)}
                    className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none appearance-none pr-8 animate-in"
                  >
                    <option value="unidad">Por Unidad</option>
                    <option value="docena">Por Docena</option>
                    <option value="mayor">Por Mayor</option>
                  </select>
                  <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-neutral-400">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={modal.cantidad}
                  onChange={event => changeQuantity(Number(event.target.value || 1))}
                  className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Precio unitario de venta
                </label>
                <div className="relative rounded-xl border border-[#d9d9d9] px-3 py-2 flex items-center bg-[#f8fafc]">
                  <span className="text-xs text-neutral-400 mr-1.5">S/</span>
                  <input
                    type="number"
                    value={modal.precio}
                    readOnly
                    className="w-full border-0 bg-transparent p-0 text-xs focus:ring-0 outline-none text-neutral-500 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Subtotal calculado
                </label>
                <div className="relative rounded-xl border border-[#d9d9d9] px-3 py-2 flex items-center bg-[#f8fafc]">
                  <span className="text-xs text-neutral-400 mr-1.5">S/</span>
                  <input
                    type="text"
                    value={(modal.precio * modal.cantidad).toFixed(2)}
                    readOnly
                    className="w-full border-0 bg-transparent p-0 text-xs focus:ring-0 outline-none text-[#414141] font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
