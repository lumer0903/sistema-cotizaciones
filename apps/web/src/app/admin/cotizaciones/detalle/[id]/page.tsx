'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { showToast } from '@/lib/toast';
import {
  cambiarEstadoCotizacion,
  exportarPdfCotizacion,
  getCotizacionDetalle,
} from '@/features/cotizaciones/api/cotizacionApi';

const ESTADO_DISPLAY: Record<string, string> = {
  borrador: 'BORRADOR',
  enviada: 'ENVIADA',
  parcialmente_pagada: 'PARCIALMENTE_PAGADA',
  aprobada: 'APROBADO',
  rechazada: 'RECHAZADO',
};

function money(n: number | string | null | undefined): string {
  const v = Number(n || 0);
  return v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function inferirTipoDoc(rucDni: string): string {
  const d = (rucDni || '').trim();
  if (d.length === 11) return 'RUC';
  return 'DNI';
}

function parseObservaciones(raw: string | null | undefined): {
  vencimiento: string;
  tipoPago: string;
  extra: string;
} {
  const s = (raw || '').trim();
  if (!s) return { vencimiento: '', tipoPago: '', extra: '' };
  const mVenc = /Vencimiento:\s*([^|]+)/i.exec(s);
  const mPago = /Pago:\s*([^|]+)/i.exec(s);
  const vencimiento = (mVenc?.[1] || '').trim();
  const tipoPago = (mPago?.[1] || '').trim();
  let extra = s
    .replace(/Vencimiento:\s*[^|]+\|?\s*/i, '')
    .replace(/Pago:\s*[^|]+\|?\s*/i, '')
    .replace(/^[\s|]+|[\s|]+$/g, '');
  if (!vencimiento && !tipoPago) {
    extra = s;
  }
  return {
    vencimiento: vencimiento === '-' ? '' : vencimiento,
    tipoPago: tipoPago === '-' ? '' : tipoPago,
    extra,
  };
}

interface ItemRow {
  codigo: string;
  descripcion: string;
  precio: number;
  cantidad: number;
  total: number;
}

/**
 * Resumen de cotización (solo lectura) con cambio de estado borrador → enviada.
 * Ojo en tablas → aquí. Edición en /editar/[id].
 */
export default function CotizacionDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [savingEstado, setSavingEstado] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [numero, setNumero] = useState('');
  const [estado, setEstado] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDoc, setClienteDoc] = useState('');
  const [clienteTipoDoc, setClienteTipoDoc] = useState('DNI');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [tipoPrecio, setTipoPrecio] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [tipoPago, setTipoPago] = useState('');
  const [incluyeCarreta, setIncluyeCarreta] = useState(false);
  const [costoCarreta, setCostoCarreta] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [itemsCount, setItemsCount] = useState(0);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const cot = await getCotizacionDetalle(id);
        if (cancelled) return;

        const estadoRaw = String(cot?.estado || '').toLowerCase();
        setNumero(String(cot?.numero || `COT-${id}`));
        setEstado(estadoRaw);
        setClienteNombre(cot?.cliente?.nombre || 'Sin cliente');
        const rucDni = (cot?.cliente?.ruc_dni || '').trim();
        setClienteDoc(rucDni);
        setClienteTipoDoc((cot?.cliente as any)?.tipo_documento || (cot?.cliente as any)?.tipo || inferirTipoDoc(rucDni));
        setClienteTelefono(cot?.cliente?.telefono || '');
        setClienteEmail(cot?.cliente?.email || '');
        setTipoPrecio(String(cot?.tipo_precio || '').toUpperCase() || 'DISTRIBUIDOR');
        setIncluyeCarreta(!!cot?.incluye_carreta);
        setCostoCarreta(Number(cot?.costo_carreta ?? 0));
        setSubtotal(Number(cot?.subtotal ?? 0));
        setTotal(Number(cot?.total ?? 0));

        const parsed = parseObservaciones(cot?.observaciones);
        const fechaVenc = (cot as any)?.fecha_vencimiento || parsed.vencimiento || '';
        setVencimiento(fechaVenc ? formatDate(fechaVenc) : '');
        setTipoPago((cot as any)?.tipo_pago || parsed.tipoPago || '');
        setObservaciones(parsed.extra || cot?.observaciones || '');

        const lineas = Array.isArray(cot?.detalle) ? cot.detalle : [];
        setItemsCount(lineas.length);
        setItems(
          lineas.map((d) => {
            const cantidad = Number(d.cantidad ?? 0);
            const precio = Number(d.precio_unitario ?? 0);
            const totalLinea =
              d.subtotal != null && d.subtotal !== ''
                ? Number(d.subtotal)
                : cantidad * precio;
            return {
              codigo: d.producto?.codigo || (d as any).codigo || '-',
              descripcion:
                d.producto?.descripcion || (d as any).descripcion || (d as any).nombre || '-',
              precio,
              cantidad,
              total: totalLinea,
            };
          }),
        );
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading cotizacion:', err);
          showToast.error('No se pudo cargar la cotización');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleEstadoChange = async (nuevo: string) => {
    if (!id || !nuevo || nuevo === estado || savingEstado) return;
    setSavingEstado(true);
    try {
      await cambiarEstadoCotizacion(id, nuevo);
      setEstado(nuevo);
      showToast.success(`Estado actualizado a ${ESTADO_DISPLAY[nuevo] || nuevo.toUpperCase()}`);
    } catch (err) {
      console.error('Error changing estado:', err);
      showToast.error('No se pudo cambiar el estado');
    } finally {
      setSavingEstado(false);
    }
  };

  const handleExportPdf = async () => {
    if (!id) return;
    setExporting(true);
    try {
      await exportarPdfCotizacion(id, `${numero || `COT-${id}`}.pdf`);
      showToast.success('PDF descargado');
    } catch {
      showToast.error('No se pudo exportar el PDF');
    } finally {
      setExporting(false);
    }
  };

  if (loading && !numero) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-zinc-500 font-['DM_Sans']">
        <Loader2 className="size-5 animate-spin mr-2" /> Cargando cotización...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-['DM_Sans'] pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-6 text-zinc-700" />
          <h1 className="text-xl font-bold text-zinc-800">{numero}</h1>
        </div>

        <div>
          <select
            value={estado}
            disabled={savingEstado}
            onChange={(e) => handleEstadoChange(e.target.value)}
            className="bg-white border border-zinc-200 text-xs font-bold text-zinc-700 px-3 py-1.5 rounded-lg shadow-sm focus:outline-none cursor-pointer uppercase"
          >
            {estado === 'borrador' ? (
              <>
                <option value="borrador">BORRADOR</option>
                <option value="enviada">ENVIADA</option>
              </>
            ) : (
              <option value={estado}>
                {ESTADO_DISPLAY[estado] || (estado || '').toUpperCase()}
              </option>
            )}
          </select>
        </div>
      </div>

      {/* Tarjeta 1: Información general */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-zinc-800">Información general</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-xs">
          <div>
            <p className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Cliente</p>
            <p className="font-bold text-zinc-800 mt-0.5">{clienteNombre}</p>
          </div>
          <div>
            <p className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Documento</p>
            <p className="font-bold text-zinc-800 mt-0.5">
              {clienteDoc ? `${clienteTipoDoc} · ${clienteDoc}` : '-'}
            </p>
          </div>
          <div>
            <p className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Teléfono</p>
            <p className="font-bold text-zinc-800 mt-0.5">{clienteTelefono || '-'}</p>
          </div>
          <div>
            <p className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Email</p>
            <p className="font-bold text-zinc-800 mt-0.5">{clienteEmail || '-'}</p>
          </div>
          <div>
            <p className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Tipo Precio</p>
            <p className="font-bold text-zinc-800 mt-0.5">{tipoPrecio || 'DISTRIBUIDOR'}</p>
          </div>
          <div>
            <p className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Vencimiento</p>
            <p className="font-bold text-zinc-800 mt-0.5">{vencimiento || '-'}</p>
          </div>
          <div>
            <p className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Tipo Pago</p>
            <p className="font-bold text-zinc-800 mt-0.5">{tipoPago || 'CONTADO'}</p>
          </div>
          <div>
            <p className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Carreta</p>
            <p className="font-bold text-zinc-800 mt-0.5">
              {incluyeCarreta ? `Si (S/ ${money(costoCarreta)})` : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta 2: Detalle, totales y observaciones */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-zinc-800">Detalle ({itemsCount} items)</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-center">Cant</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="font-medium text-zinc-700">
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-zinc-400">
                      Sin items en el detalle
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-bold">{it.codigo}</TableCell>
                      <TableCell className="uppercase text-[11px]">{it.descripcion}</TableCell>
                      <TableCell className="text-right">S/ {money(it.precio)}</TableCell>
                      <TableCell className="text-center">{it.cantidad}</TableCell>
                      <TableCell className="text-right font-bold">S/ {money(it.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 text-xs text-right font-medium text-zinc-600 pl-4">
            <div className="flex justify-between items-center">
              <span>Subtotal</span>
              <span className="font-semibold text-zinc-800">S/ {money(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Carreta</span>
              <span className="font-semibold text-zinc-800">S/ {money(incluyeCarreta ? costoCarreta : 0)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-zinc-200 pt-3 mt-3">
              <span className="text-sm font-bold text-zinc-700">Total</span>
              <span className="text-lg font-black text-zinc-900">S/ {money(total)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Observaciones</p>
          <textarea
            readOnly
            value={observaciones}
            placeholder="Sin observaciones"
            className="w-full min-h-[72px] rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 outline-none resize-y"
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/cotizaciones')}
        >
          <ArrowLeft className="size-4" /> Volver
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={exporting}
          onClick={handleExportPdf}
        >
          Exportar PDF
        </Button>
      </div>
    </div>
  );
}
