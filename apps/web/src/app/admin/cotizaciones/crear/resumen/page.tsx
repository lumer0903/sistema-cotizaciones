'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Download, Save, Loader2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import {
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
  crearCliente,
  actualizarCliente,
  crearCotizacion,
  actualizarCotizacion,
  cambiarEstadoCotizacion,
  exportarPdfCotizacion,
} from '@/features/cotizaciones/api/cotizacionApi';
import { formatCode } from '@/lib/formatters';

export default function ResumenCotizacionPage() {
  const router = useRouter();
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
            ? `Cotización ${numeroFinal} guardada como ENVIADA`
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
        showToast.success(`Estado actualizado a ${nuevoEstado.toUpperCase()}`);
      } catch (error: any) {
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
      router.push('/admin/cotizaciones');
    }
  };

  const subtotal = useMemo(() => items.reduce((a, i) => a + Number(i.total || 0), 0), [items]);
  const costoCarreta = incluyeCarreta ? 15 : 0;
  const total = subtotal + costoCarreta;

  if (items.length === 0 && !idCotizacionGuardada) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center space-y-4">
        <p className="text-sm text-zinc-500">No hay productos en el carrito.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/cotizaciones/crear')}
        >
          <ArrowLeft className="size-4" /> Volver a crear
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1100px] mx-auto space-y-6 font-['DM_Sans'] pb-10">
      {/* Header con Select global */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-zinc-800" />
          <span className="text-xl font-bold text-zinc-800 tracking-tight">{numeroCotizacion}</span>
        </div>

        <div className="w-36">
          <Select
            value={estadoActual}
            onChange={(e) => handleCambiarEstadoSelect(e.target.value as 'borrador' | 'enviada')}
            className="text-xs font-bold uppercase"
          >
            <option value="borrador">BORRADOR</option>
            <option value="enviada">ENVIADA</option>
          </Select>
        </div>
      </div>

      {/* Información General */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-zinc-800">Información general</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-xs">
          <div>
            <span className="block text-zinc-400 font-bold uppercase text-[10px]">CLIENTE</span>
            <span className="font-semibold text-zinc-800">{cliente.nombre || '-'}</span>
          </div>
          <div>
            <span className="block text-zinc-400 font-bold uppercase text-[10px]">DOCUMENTO</span>
            <span className="font-semibold text-zinc-800">{cliente.tipoDocumento} · {cliente.ruc_dni || '-'}</span>
          </div>
          <div>
            <span className="block text-zinc-400 font-bold uppercase text-[10px]">TELÉFONO</span>
            <span className="font-semibold text-zinc-800">{cliente.telefono || '-'}</span>
          </div>
          <div>
            <span className="block text-zinc-400 font-bold uppercase text-[10px]">EMAIL</span>
            <span className="font-semibold text-zinc-800">{cliente.email || '-'}</span>
          </div>
          <div>
            <span className="block text-zinc-400 font-bold uppercase text-[10px]">TIPO PRECIO</span>
            <span className="font-semibold text-zinc-800">{tipoPrecioCliente}</span>
          </div>
          <div>
            <span className="block text-zinc-400 font-bold uppercase text-[10px]">VENCIMIENTO</span>
            <span className="font-semibold text-zinc-800">{fechaVencimiento || '-'}</span>
          </div>
          <div>
            <span className="block text-zinc-400 font-bold uppercase text-[10px]">TIPO PAGO</span>
            <span className="font-semibold text-zinc-800">{tipoPago || '-'}</span>
          </div>
          <div>
            <span className="block text-zinc-400 font-bold uppercase text-[10px]">CARRETA</span>
            <span className="font-semibold text-zinc-800">{incluyeCarreta ? 'Si (S/ 15.00)' : 'No'}</span>
          </div>
        </div>
      </div>

      {/* Detalle, Totales y Observaciones */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-zinc-800">Detalle ({items.length} items)</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 border border-zinc-200/80 rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">CÓDIGO</TableHead>
                  <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">DESCRIPCIÓN</TableHead>
                  <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">PRECIO</TableHead>
                  <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">CANT</TableHead>
                  <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">TOTAL</TableHead>
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

          <div className="space-y-1.5 text-xs text-zinc-600 self-start pl-4">
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
      <div className="flex justify-end gap-3 pt-2">
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