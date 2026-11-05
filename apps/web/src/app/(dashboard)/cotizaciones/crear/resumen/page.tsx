'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Download, Save, UserRound, Package, CalendarDays, CreditCard, MessageSquare, Info } from 'lucide-react';
import { showToast } from '@/lib/toast';
import {
  Card, CardHeader, CardContent, Badge, ESTADO_BADGE,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Select,
  Textarea,
} from '@/components/ui';
import { useCrearCotizacionStore } from '@/features/cotizaciones/store/useCrearCotizacionStore';
import {
  getCotizacionDetalle,
  crearCliente,
  actualizarCliente,
  crearCotizacion,
  actualizarCotizacion,
  cambiarEstadoCotizacion,
  exportarPdfCotizacion,
} from '@/features/cotizaciones/api/cotizacionApi';
import { formatCode, formatPrice } from '@/lib/formatters';

export default function ResumenCotizacionPage() {
  const router = useRouter();
  const base = '/cotizaciones';
  const {
    numeroCotizacion,
    cliente,
    fechaVencimiento,
    tipoPago,
    tipoPrecioCliente,
    items,
    incluyeCarreta,
    setCotizacionGuardada,
    idCotizacionGuardada,
    numeroGuardado,
    editandoId,
  } = useCrearCotizacionStore();

  const [estadoActual, setEstadoActual] = useState<string>('borrador');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);

  const [estadoServidor, setEstadoServidor] = useState<{ id: number; estado: string } | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);

  useEffect(() => {
    if (!idCotizacionGuardada) return;
    let cancelado = false;
    getCotizacionDetalle(idCotizacionGuardada).then(cot => {
      if (cancelado) return;
      const estado = String(cot.estado || 'borrador').toLowerCase();
      setEstadoServidor({ id: idCotizacionGuardada, estado });
      setEstadoActual(estado);
      setObservaciones(cot.observaciones || '');
      setErrorCarga(false);
    }).catch(() => {
      if (!cancelado) setErrorCarga(true);
    });
    return () => { cancelado = true; };
  }, [idCotizacionGuardada]);

  const enModoEdicion = editandoId != null && idCotizacionGuardada === editandoId;

  const estadoVerificado = estadoServidor?.id === idCotizacionGuardada;
  const editable = !idCotizacionGuardada || (enModoEdicion && estadoVerificado && estadoServidor?.estado === 'borrador');

  const asegurarCliente = async (): Promise<number> => {
    let idCliente = cliente.id_cliente;
    if (!idCliente) {
      const nuevo = await crearCliente({
        nombre: cliente.nombre.trim(),
        telefono: cliente.telefono || undefined,
        email: cliente.email || undefined,
        ruc_dni: cliente.ruc_dni || undefined,
        tipo: tipoPrecioCliente === 'DISTRIBUIDOR' ? 'distribuidor' : 'normal',
      });
      idCliente = nuevo.id_cliente;
    } else if (cliente.clienteEditado) {
      await actualizarCliente(idCliente, {
        nombre: cliente.nombre.trim(),
        telefono: cliente.telefono,
        email: cliente.email,
        ruc_dni: cliente.ruc_dni,
        tipo: tipoPrecioCliente === 'DISTRIBUIDOR' ? 'distribuidor' : 'normal',
      });
    }
    return Number(idCliente);
  };

  const construirDetalle = () => {
    const detallePayload = items
      .filter((it) => Number((it as any).id_producto ?? 0) > 0)
      .map((it) => ({
        id_producto: Number((it as any).id_producto),
        tipo_venta: String((it as any).tipo_venta || 'MAYOR').toLowerCase(),
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precioUnitario),
        color_notas: (it as any).observacion || null,
        es_sugerido_ia: Boolean((it as any).es_sugerido_ia),
      }));
    if (detallePayload.length === 0) {
      throw new Error('Los items no tienen producto válido (falta id_producto). Vuelve y agrégalos de nuevo.');
    }
    return detallePayload;
  };

  const handleGuardar = async (silent = false) => {
    if (idCotizacionGuardada != null && numeroGuardado === numeroCotizacion) {
      if (!silent) showToast.info(`Esta cotización ya fue guardada como ${numeroGuardado}`);
      return idCotizacionGuardada;
    }
    if (items.length === 0) {
      showToast.error('Agrega al menos un producto');
      return null;
    }
    if (!cliente.nombre.trim()) {
      showToast.error('El nombre del cliente es obligatorio');
      return null;
    }
    setGuardando(true);
    try {
      const idCliente = await asegurarCliente();
      const detallePayload = construirDetalle();

      const basePayload = {
        id_cliente: idCliente,
        tipo_precio: tipoPrecioCliente === 'DISTRIBUIDOR' ? 'distribuidor' : 'normal',
        observaciones: observaciones.trim(),
        incluye_carreta: incluyeCarreta,
        costo_carreta: costoCarreta,
        fecha_vencimiento: fechaVencimiento || null,
        detalle: detallePayload,
      };
      let cot: any;
      try {
        cot = await crearCotizacion({ ...basePayload, numero: numeroCotizacion });
      } catch (err: any) {
        if (String(err?.message || '').toLowerCase().includes('correlativo')) {
          cot = await crearCotizacion(basePayload);
        } else {
          throw err;
        }
      }

      const idCot = Number(cot?.id_cotizacion ?? cot?.id ?? 0);
      if (!idCot) throw new Error('No se pudo obtener el ID de la cotización creada');

      const numeroFinal = String((cot as any)?.numero ?? numeroCotizacion);

      setCotizacionGuardada(idCot, numeroFinal);
      if (estadoActual === 'enviada') {
        await cambiarEstadoCotizacion(idCot, 'enviada');
      }
      setEstadoServidor({ id: idCot, estado: estadoActual });
      if (!silent) {
        showToast.success(
          estadoActual === 'enviada'
            ? `Cotización ${numeroFinal} guardada como ENVIADO`
            : `Cotización ${numeroFinal} guardada como BORRADOR`
        );
      }
      return idCot;
    } catch (e: any) {
      console.error('Error guardando cotización:', e);
      showToast.error(e?.message || 'No se pudo guardar la cotización');
      return null;
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarCambios = async () => {
    if (!enModoEdicion || editandoId == null || !editable) return null;
    if (items.length === 0) {
      showToast.error('Agrega al menos un producto');
      return null;
    }
    if (!cliente.nombre.trim()) {
      showToast.error('El nombre del cliente es obligatorio');
      return null;
    }
    setGuardando(true);
    try {
      const vigente = await getCotizacionDetalle(editandoId);
      if (vigente.estado !== 'borrador') {
        setEstadoServidor({ id: editandoId, estado: String(vigente.estado) });
        setEstadoActual(String(vigente.estado));
        throw new Error('La cotización ya no es un borrador. Puedes descargar su PDF desde el listado.');
      }
      const idCliente = await asegurarCliente();
      const detallePayload = construirDetalle();
      await actualizarCotizacion(editandoId, {
        id_cliente: idCliente,
        tipo_precio: tipoPrecioCliente === 'DISTRIBUIDOR' ? 'distribuidor' : 'normal',
        observaciones: observaciones.trim(),
        incluye_carreta: incluyeCarreta,
        costo_carreta: costoCarreta,
        fecha_vencimiento: fechaVencimiento || null,
        detalle: detallePayload,
      });

      if (estadoActual === 'enviada') {
        await cambiarEstadoCotizacion(editandoId, 'enviada');
      }

      setEstadoServidor({ id: editandoId, estado: estadoActual });
      showToast.success(`Cambios guardados en ${numeroGuardado ?? numeroCotizacion}`);
      return editandoId;
    } catch (e: any) {
      console.error('Error guardando cambios:', e);
      showToast.error(e?.message || 'No se pudieron guardar los cambios');
      return null;
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstadoSelect = (nuevoEstado: 'borrador' | 'enviada') => {
    if (editable) setEstadoActual(nuevoEstado);
  };

  const executeExport = async (idToExport: number): Promise<boolean> => {
    setExportando(true);
    try {
      await exportarPdfCotizacion(idToExport, `${numeroGuardado ?? numeroCotizacion}.pdf`);
      showToast.success('PDF descargado');
      return true;
    } catch (e: any) {
      showToast.error(e?.message || 'No se pudo exportar el PDF');
      return false;
    } finally {
      setExportando(false);
    }
  };

  const handleExportarClick = async () => {
    let exported = false;
    if (!idCotizacionGuardada) {
      const savedId = await handleGuardar(true);
      if (savedId) {
        exported = await executeExport(savedId);
      }
    } else if (enModoEdicion && editable) {
      const savedId = await handleGuardarCambios();
      if (savedId) exported = await executeExport(savedId);
    } else {
      exported = await executeExport(idCotizacionGuardada);
    }
    if (exported) {
      router.push(base);
    }
  };

  const subtotal = useMemo(() => items.reduce((a, i) => a + Number(i.total || 0), 0), [items]);
  const costoCarreta = incluyeCarreta ? 15 : 0;
  const total = subtotal + costoCarreta;

  if (items.length === 0 && !idCotizacionGuardada) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center sm:p-10">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
          <FileText className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold text-brand-subtitle">Tu cotización aún no tiene productos</h1>
        <p className="mt-2 text-sm text-brand-options">Agrega productos para revisar el detalle y preparar el documento.</p>
        <Button variant="outline" className="mt-5" onClick={() => router.push(`${base}/crear`)}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Volver a crear
        </Button>
      </Card>
    );
  }

  const ocupado = guardando || exportando;
  const estadoVisible = estadoServidor?.estado ?? 'borrador';
  const estadoLabel = estadoVisible === 'enviada' ? 'Enviado' : estadoVisible.replaceAll('_', ' ');
  const vencimientoLabel = fechaVencimiento
    ? fechaVencimiento.split('T')[0].split('-').reverse().join('/')
    : 'Sin definir';

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-options">{numeroGuardado ?? numeroCotizacion}</span>
            <Badge variant={ESTADO_BADGE[estadoVisible] ?? 'neutral'} size="estado">{estadoLabel}</Badge>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-brand-subtitle sm:text-2xl">Resumen de cotización</h1>
          <p className="mt-1 text-sm text-brand-options">Revisa los datos y los importes antes de guardar o descargar.</p>
        </div>
        <Button variant="outline" disabled={ocupado} onClick={() => router.back()}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Volver
        </Button>
      </header>

      {idCotizacionGuardada && !editable && (
        <div role={errorCarga ? 'alert' : 'status'} className="flex items-start gap-2.5 rounded-xl border border-border-default bg-surface px-4 py-3 text-sm text-brand-options">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{errorCarga ? 'No se pudo verificar el estado. Vuelve al listado para abrir la cotización.' : !estadoVerificado ? 'Verificando estado de la cotización…' : 'Cotización guardada. Puedes descargar el PDF. Para editar un borrador, ábrelo desde el listado.'}</p>
        </div>
      )}

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-brand-subtitle"><UserRound className="size-4 text-accent-ink" aria-hidden="true" />Datos del cliente</h2>
              <Badge variant={tipoPrecioCliente === 'DISTRIBUIDOR' ? 'distribuidor' : 'tienda'} size="estado">{tipoPrecioCliente === 'DISTRIBUIDOR' ? 'Distribuidor' : 'Tienda'}</Badge>
            </CardHeader>
            <CardContent className="space-y-4 px-4 py-4 sm:px-5">
              <div>
                <p className="break-words text-base font-semibold text-brand-subtitle">{cliente.nombre || 'Sin cliente'}</p>
                <p className="mt-1 text-sm text-brand-options">{cliente.tipoDocumento} · {cliente.ruc_dni || 'Sin documento'}</p>
              </div>
              <dl className="grid min-w-0 gap-4 border-t border-border-default pt-4 sm:grid-cols-2">
                <div className="min-w-0"><dt className="text-xs text-brand-options">Teléfono</dt><dd className="mt-1 break-words text-sm font-medium text-brand-subtitle">{cliente.telefono || 'Sin registrar'}</dd></div>
                <div className="min-w-0"><dt className="text-xs text-brand-options">Correo electrónico</dt><dd className="mt-1 break-all text-sm font-medium text-brand-subtitle">{cliente.email || 'Sin registrar'}</dd></div>
              </dl>
            </CardContent>
          </Card>

          <section aria-labelledby="resumen-productos" className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 id="resumen-productos" className="flex items-center gap-2 text-sm font-bold text-brand-subtitle"><Package className="size-4 text-accent-ink" aria-hidden="true" />Productos y precios</h2>
              <span className="text-xs text-brand-options">{items.length} {items.length === 1 ? 'producto' : 'productos'}</span>
            </div>
            <ul aria-label="Productos de la cotización" className="space-y-3 sm:hidden">
              {items.map(it => (
                <li key={it.id}>
                  <Card className="p-4">
                    <p className="text-sm font-semibold text-brand-subtitle">{formatCode(it.codigo)}</p>
                    <p className="mt-1 text-xs leading-relaxed text-brand-options">{it.descripcion}</p>
                    <div className="mt-3 grid grid-cols-[auto_1fr] items-end gap-3 border-t border-border-default pt-3">
                      <div><p className="text-xs text-brand-options">Cantidad</p><p className="mt-1 text-base font-semibold text-brand-subtitle tnum">{it.cantidad}</p></div>
                      <div className="text-right"><p className="text-xs text-brand-options">Precio unitario</p><p className="mt-1 text-lg font-bold text-accent-ink tnum">{formatPrice(it.precioUnitario)}</p></div>
                      <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2"><span className="text-xs font-semibold text-brand-subtitle">Total del producto</span><span className="text-lg font-bold text-brand-subtitle tnum">{formatPrice(it.total ?? 0)}</span></div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
            <div className="hidden sm:block"><Table scrollLabel="Productos de la cotización">
              <TableHeader><TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right whitespace-nowrap">Precio unitario</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right whitespace-nowrap">Total producto</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.map(it => (
                  <TableRow key={it.id}>
                    <TableCell className="min-w-[180px] max-w-md">
                      <span className="block text-sm font-semibold text-brand-subtitle">{formatCode(it.codigo)}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-brand-options">{it.descripcion}</span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap"><span className="inline-block rounded-lg border border-accent-primary/20 bg-accent-soft px-2.5 py-1 text-base font-bold text-accent-ink tnum">{formatPrice(it.precioUnitario)}</span></TableCell>
                    <TableCell className="text-right">{it.cantidad}</TableCell>
                    <TableCell className="bg-surface-muted/70 text-right text-base font-bold whitespace-nowrap">{formatPrice(it.total ?? 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          </section>

          <Card>
            <CardHeader className="px-4 py-3.5 sm:px-5"><h2 className="text-sm font-bold text-brand-subtitle">Condiciones comerciales</h2></CardHeader>
            <CardContent className="px-4 py-4 sm:px-5">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-2.5"><CalendarDays className="mt-0.5 size-4 shrink-0 text-brand-options" aria-hidden="true" /><div><dt className="text-xs text-brand-options">Vencimiento</dt><dd className="mt-0.5 font-medium text-brand-subtitle">{vencimientoLabel}</dd></div></div>
                <div className="flex items-start gap-2.5"><CreditCard className="mt-0.5 size-4 shrink-0 text-brand-options" aria-hidden="true" /><div><dt className="text-xs text-brand-options">Forma de pago</dt><dd className="mt-0.5 font-medium text-brand-subtitle">{tipoPago || 'Sin definir'}</dd></div></div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 sm:px-5"><h2 className="flex items-center gap-2 text-sm font-bold text-brand-subtitle"><MessageSquare className="size-4 text-accent-ink" aria-hidden="true" />Observaciones del asesor</h2><span className="text-xs text-brand-options">Opcional</span></CardHeader>
            <CardContent className="px-4 py-4 sm:px-5">
              <Textarea aria-label="Observaciones de la cotización" value={observaciones} disabled={!editable || ocupado}
                onChange={e => setObservaciones(e.target.value)} rows={3} placeholder="Escribe una observación si es necesario" />
            </CardContent>
          </Card>
        </div>

        <aside aria-label="Importe y acciones de la cotización" className="min-w-0 xl:sticky xl:top-20">
          <Card>
            <CardHeader className="px-4 py-3.5 sm:px-5"><h2 className="text-sm font-bold text-brand-subtitle">Total y confirmación</h2></CardHeader>
            <CardContent className="space-y-5 px-4 py-4 sm:px-5">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-brand-options">Subtotal de productos</dt><dd className="font-semibold text-brand-subtitle tnum">{formatPrice(subtotal)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-brand-options">Carreta{!incluyeCarreta && ' · No incluida'}</dt><dd className="font-semibold text-brand-subtitle tnum">{formatPrice(costoCarreta)}</dd></div>
              </dl>
              <div className="rounded-xl border border-accent-primary/25 bg-accent-soft p-4">
                <p className="text-sm font-semibold text-brand-subtitle">Total a pagar</p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-brand-subtitle tnum" data-testid="quotation-total">{formatPrice(total)}</p>
              </div>
              <Select label={editable ? 'Estado al guardar' : 'Estado de la cotización'} value={estadoActual}
                disabled={!editable || ocupado} onChange={e => handleCambiarEstadoSelect(e.target.value as 'borrador' | 'enviada')}
                options={[{ label: 'BORRADOR', value: 'borrador' }, { label: 'ENVIADO', value: 'enviada' }, ...(!['borrador', 'enviada'].includes(estadoActual) ? [{ label: estadoActual.toUpperCase(), value: estadoActual }] : [])]} />
              <div className="space-y-2">
                {!idCotizacionGuardada && <Button className="w-full" variant="outline" loading={guardando} disabled={ocupado || items.length === 0} onClick={() => handleGuardar(false)}><Save className="size-4" aria-hidden="true" />{guardando ? 'Guardando...' : 'Guardar'}</Button>}
                {enModoEdicion && editable && <Button className="w-full" variant="outline" loading={guardando} disabled={ocupado || items.length === 0} onClick={handleGuardarCambios}><Save className="size-4" aria-hidden="true" />{guardando ? 'Guardando...' : 'Guardar cambios'}</Button>}
                <Button className="w-full" variant="primary" loading={exportando} disabled={ocupado} onClick={handleExportarClick}><Download className="size-4" aria-hidden="true" />{exportando ? 'Generando...' : 'Exportar PDF'}</Button>
              </div>
              {!idCotizacionGuardada && <p className="text-xs leading-relaxed text-brand-options">Al exportar el PDF también se guardará la cotización.</p>}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
