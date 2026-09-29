'use client';

import { useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, ChevronDown, FileText, Download, Save, Loader2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Textarea,
} from '@/components/ui';
import { useCrearCotizacionStore } from '@/features/cotizaciones/store/useCrearCotizacionStore';
import {
  crearCliente,
  actualizarCliente,
  crearCotizacion,
  actualizarCotizacion,
  cambiarEstadoCotizacion,
  exportarPdfCotizacion,
} from '@/features/cotizaciones/api/cotizacionApi';
import { formatCode } from '@/lib/formatters';

// Paleta de la cápsula-select de estado (misma que Badge size="estado")
const ESTADO_SELECT_CLASES: Record<string, string> = {
  borrador: 'bg-estado-borrador text-estado-borrador-text border-estado-borrador/60',
  enviada: 'bg-estado-enviado-soft text-estado-enviado-text border-estado-enviado/40',
};

export default function ResumenCotizacionPage() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const base = pathname.startsWith('/vendedor') ? '/vendedor/cotizaciones' : '/admin/cotizaciones';
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

  const [estadoActual, setEstadoActual] = useState<'borrador' | 'enviada'>('borrador');
  const [observaciones, setObservaciones] = useState('Enviar por shalom');
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);

  const enModoEdicion = editandoId != null && idCotizacionGuardada === editandoId;

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
        observaciones: observaciones || `Vencimiento: ${fechaVencimiento || '-'} | Pago: ${tipoPago || '-'}`,
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

      if (estadoActual === 'enviada') {
        await cambiarEstadoCotizacion(idCot, 'enviada');
      }

      setCotizacionGuardada(idCot, numeroFinal);
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
    if (!enModoEdicion || editandoId == null) return null;
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
      await actualizarCotizacion(editandoId, {
        id_cliente: idCliente,
        tipo_precio: tipoPrecioCliente === 'DISTRIBUIDOR' ? 'distribuidor' : 'normal',
        observaciones: observaciones || `Vencimiento: ${fechaVencimiento || '-'} | Pago: ${tipoPago || '-'}`,
        incluye_carreta: incluyeCarreta,
        costo_carreta: costoCarreta,
        fecha_vencimiento: fechaVencimiento || null,
        detalle: detallePayload,
      });

      if (estadoActual === 'enviada') {
        await cambiarEstadoCotizacion(editandoId, 'enviada');
      }

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

  const handleCambiarEstadoSelect = async (nuevoEstado: 'borrador' | 'enviada') => {
    setEstadoActual(nuevoEstado);
    if (idCotizacionGuardada) {
      try {
        await cambiarEstadoCotizacion(idCotizacionGuardada, nuevoEstado);
        showToast.success(`Estado actualizado a ${nuevoEstado === 'enviada' ? 'ENVIADO' : 'BORRADOR'}`);
      } catch {
        showToast.error('Error al actualizar el estado');
        setEstadoActual(estadoActual);
      }
    }
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
        <div className="max-w-3xl mx-auto p-6 sm:p-8 text-center space-y-4">
        <p className="text-sm text-zinc-500">No hay productos en el carrito.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`${base}/crear`)}
        >
          <ArrowLeft className="size-4" /> Volver a crear
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1100px] mx-auto space-y-6 font-['DM_Sans'] pb-10">
      {/* Header con Select global (cápsula de estado) */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-zinc-800" />
          <span className="text-xl font-bold text-zinc-800 tracking-tight">{numeroCotizacion}</span>
        </div>

        <div className="relative inline-flex">
          <select
            value={estadoActual}
            onChange={(e) => handleCambiarEstadoSelect(e.target.value as 'borrador' | 'enviada')}
            aria-label="Estado de la cotización"
            className={`appearance-none cursor-pointer rounded-full border px-4 py-1.5 pr-8 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-soft transition-colors ${ESTADO_SELECT_CLASES[estadoActual] ?? 'bg-neutral-200 text-neutral-700 border-neutral-300/60'}`}
          >
            <option value="borrador">BORRADOR</option>
            <option value="enviada">ENVIADO</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 opacity-60" />
        </div>
      </div>

      {/* Información General */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-zinc-200/80 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-zinc-800">Información general</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-xs">
          <div>
            <span className="block text-zinc-500 font-bold uppercase text-xs">CLIENTE</span>
            <span className="font-semibold text-zinc-800">{cliente.nombre || '-'}</span>
          </div>
          <div>
            <span className="block text-zinc-500 font-bold uppercase text-xs">DOCUMENTO</span>
            <span className="font-semibold text-zinc-800">{cliente.tipoDocumento} · {cliente.ruc_dni || '-'}</span>
          </div>
          <div>
            <span className="block text-zinc-500 font-bold uppercase text-xs">TELÉFONO</span>
            <span className="font-semibold text-zinc-800">{cliente.telefono || '-'}</span>
          </div>
          <div>
            <span className="block text-zinc-500 font-bold uppercase text-xs">EMAIL</span>
            <span className="font-semibold text-zinc-800">{cliente.email || '-'}</span>
          </div>
          <div>
            <span className="block text-zinc-500 font-bold uppercase text-xs">TIPO PRECIO</span>
            <span className="font-semibold text-zinc-800">{tipoPrecioCliente}</span>
          </div>
          <div>
            <span className="block text-zinc-500 font-bold uppercase text-xs">VENCIMIENTO</span>
            <span className="font-semibold text-zinc-800">{fechaVencimiento || '-'}</span>
          </div>
          <div>
            <span className="block text-zinc-500 font-bold uppercase text-xs">TIPO PAGO</span>
            <span className="font-semibold text-zinc-800">{tipoPago || '-'}</span>
          </div>
          <div>
            <span className="block text-zinc-500 font-bold uppercase text-xs">CARRETA</span>
            <span className="font-semibold text-zinc-800">{incluyeCarreta ? 'Si (S/ 15.00)' : 'No'}</span>
          </div>
        </div>
      </div>

      {/* Detalle, Totales y Observaciones */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-zinc-200/80 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-zinc-800">Detalle ({items.length} items)</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 border border-zinc-200/80 rounded-xl overflow-hidden">
            <Table wrapperClassName="border-0 rounded-none shadow-none">
              <TableHeader className="bg-zinc-50/50">
                <TableRow>
                  <TableHead className="text-xs font-bold text-zinc-500 uppercase">CÓDIGO</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 uppercase">DESCRIPCIÓN</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 uppercase">PRECIO</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 uppercase">CANT</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 uppercase">TOTAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-bold text-xs">{formatCode(it.codigo)}</TableCell>
                    <TableCell className="text-xs uppercase">{it.descripcion}</TableCell>
                    <TableCell className="text-xs">S/ {Number(it.precioUnitario).toFixed(2)}</TableCell>
                    <TableCell className="text-xs">{it.cantidad}</TableCell>
                    <TableCell className="font-bold text-xs">S/ {Number(it.total).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-1.5 text-xs text-zinc-600 self-start lg:pl-4">
            <div className="flex justify-between items-center">
              <span>Subtotal</span>
              <span className="font-semibold text-zinc-800">S/ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Carreta</span>
              <span className="font-semibold text-zinc-800">S/ {costoCarreta.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-zinc-900 pt-2">
              <span className="text-base font-bold">Total</span>
              <span className="text-base font-bold">S/ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Sección de Observaciones usando Textarea global */}
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-bold text-zinc-800">Observaciones</h3>
          <div className="max-w-md">
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Botones Inferiores con Button global */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="px-5 rounded-xl font-medium"
        >
          <ArrowLeft className="size-4 mr-1.5" /> Volver
        </Button>

        {!idCotizacionGuardada && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleGuardar(false)}
            disabled={guardando || items.length === 0}
          >
            {guardando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        )}

        {enModoEdicion && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleGuardarCambios}
            disabled={guardando || items.length === 0}
          >
            {guardando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        )}

        <Button
          variant="primary"
          onClick={handleExportarClick}
          disabled={exportando || guardando}
          className="px-5 rounded-xl font-medium bg-brand-primary hover:bg-brand-hover text-white shadow-sm"
        >
          {exportando || guardando ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4 mr-1.5" />}
          {exportando ? 'Generando...' : 'Exportar PDF'}
        </Button>
      </div>
    </div>
  );
}