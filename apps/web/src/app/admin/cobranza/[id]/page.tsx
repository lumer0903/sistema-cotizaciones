'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Loader2,
  DollarSign,
  Clock,
  User,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import {
  getCobranzaDetalle,
  registrarPagoCotizacion,
} from '@/features/cotizaciones/api/cotizacionApi';
import { CobranzaDetalle, HistorialPago } from '@/types/cobranza';

const METODOS_PAGO = [
  { label: 'Efectivo', value: 'efectivo' },
  { label: 'Transferencia', value: 'transferencia' },
  { label: 'Tarjeta crédito', value: 'tarjeta_credito' },
  { label: 'Tarjeta débito', value: 'tarjeta_debito' },
  { label: 'Yape / Plin', value: 'yape_plin' },
  { label: 'Mixto', value: 'mixto' },
];

const ESTADO_BADGE: Record<string, 'secondary' | 'warning' | 'success' | 'danger'> = {
  pendiente: 'secondary',
  parcial: 'warning',
  pagada: 'success',
  vencida: 'danger',
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagada: 'Pagada',
  vencida: 'Vencida',
};

function money(n: number): string {
  return Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    return '—';
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function CobranzaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || '');

  const [cuenta, setCuenta] = useState<CobranzaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [referencia, setReferencia] = useState('');

  const fetchCuenta = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getCobranzaDetalle(id);
      setCuenta(data);
    } catch (error: any) {
      console.error(error);
      showToast.error(error?.message || 'No se pudo cargar la cuenta');
      setCuenta(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCuenta();
  }, [fetchCuenta]);

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuenta) return;
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      showToast.warning('Ingrese un monto mayor a 0');
      return;
    }
    if (montoNum > cuenta.saldo + 0.009) {
      showToast.warning(`El monto no puede superar el saldo (S/ ${money(cuenta.saldo)})`);
      return;
    }

    setSubmitting(true);
    try {
      await registrarPagoCotizacion(cuenta.id_cotizacion, {
        monto: montoNum,
        metodo_pago: metodoPago,
        referencia: referencia || null,
      });
      showToast.success('Pago registrado correctamente');
      setMonto('');
      setReferencia('');
      await fetchCuenta();
    } catch (error: any) {
      showToast.error(error?.message || 'No se pudo registrar el pago');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!cuenta) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <p className="text-zinc-600">No se encontró la cuenta por cobrar.</p>
        <Button variant="outline" onClick={() => router.push('/admin/cobranza')}>
          <ArrowLeft className="size-4" /> Volver a cobranza
        </Button>
      </div>
    );
  }

  const pagado = cuenta.pagado || 0;
  const saldo = cuenta.saldo || 0;
  const pagos: HistorialPago[] = cuenta.pagos || [];
  const saldoCero = saldo <= 0.009;

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-['DM_Sans']">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/cobranza"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-brand-primary"
          >
            <ArrowLeft className="size-4" /> Cobranza
          </Link>
          <span className="text-xl font-black text-zinc-700 tracking-tight">{cuenta.numero}</span>
          <Badge variant={ESTADO_BADGE[cuenta.estado_cobranza] || 'neutral'}>
            {ESTADO_LABELS[cuenta.estado_cobranza] || cuenta.estado_cobranza}
          </Badge>
        </div>
        <Link
          href={`/admin/cotizaciones/detalle/${cuenta.id_cotizacion}`}
          className="text-sm font-semibold text-brand-primary hover:underline"
          title="Ver documento (solo lectura)"
        >
          Ver cotización
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
            <DollarSign className="h-4 w-4" /> Total
          </div>
          <p className="text-2xl font-bold text-gray-900">S/ {money(cuenta.total)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
            <DollarSign className="h-4 w-4" /> Pagado
          </div>
          <p className="text-2xl font-bold text-estado-aprobado-text">S/ {money(pagado)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
            <Clock className="h-4 w-4" /> Saldo
          </div>
          <p className={`text-2xl font-bold ${saldoCero ? 'text-estado-aprobado-text' : 'text-brand-primary'}`}>
            S/ {money(saldo)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 text-zinc-700 font-bold text-sm uppercase tracking-wide">
          <User className="h-4 w-4" /> Datos
        </div>
        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-gray-500">Cliente</p>
            <p className="font-semibold text-gray-900">{cuenta.cliente?.nombre || 'Sin cliente'}</p>
            {cuenta.cliente?.ruc_dni && <p className="text-xs text-gray-400">{cuenta.cliente.ruc_dni}</p>}
          </div>
          <div>
            <p className="text-gray-500">Emisión</p>
            <p className="font-semibold text-gray-900">{formatDate(cuenta.created_at)}</p>
          </div>
          <div>
            <p className="text-gray-500">Vencimiento</p>
            <p className="font-semibold text-gray-900">{formatDate(cuenta.fecha_vencimiento)}</p>
            {cuenta.dias_atraso > 0 && (
              <p className="text-xs text-red-600 font-semibold">{cuenta.dias_atraso} días de atraso</p>
            )}
          </div>
        </div>
        {cuenta.observaciones && (
          <div>
            <p className="text-gray-500 text-sm">Observaciones</p>
            <p className="text-gray-800 text-sm">{cuenta.observaciones}</p>
          </div>
        )}
      </div>

      {!saldoCero && (
        <form
          onSubmit={handleRegistrarPago}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-zinc-700 font-bold text-sm uppercase tracking-wide">
            <DollarSign className="h-4 w-4" /> Registrar abono
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Monto (S/)"
              type="number"
              min="0.01"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              required
            />
            <Select
              label="Método de pago"
              value={metodoPago}
              onChange={(e) => setMetodoPago(String(e.target.value))}
              options={METODOS_PAGO}
            />
            <Input
              label="Referencia"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={submitting} disabled={submitting}>
              Registrar pago
            </Button>
          </div>
        </form>
      )}

      <div>
        <div className="px-6 py-4 border border-gray-100 rounded-t-xl border-b-0 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-700 font-bold text-sm uppercase tracking-wide">
            <FileText className="h-4 w-4" /> Historial de pagos
          </div>
          <span className="text-sm text-gray-500">{pagos.length} pago(s)</span>
        </div>
        {pagos.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm border border-gray-100 rounded-b-xl bg-white">Sin pagos registrados</div>
        ) : (
          <Table className="rounded-t-none border-t-0">
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos.map((p) => (
                <TableRow key={p.id_pago}>
                  <TableCell className="text-sm text-gray-600">{formatDateTime(p.created_at)}</TableCell>
                  <TableCell className="text-sm text-right font-semibold text-estado-aprobado-text">
                    S/ {money(p.monto)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700 capitalize">
                    {(p.metodo_pago || '').replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{p.referencia || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-700">{p.usuario?.nombre || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
