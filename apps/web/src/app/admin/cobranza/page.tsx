'use client';

import { Search, DollarSign, AlertTriangle, Clock, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CuentaPorCobrar } from '@/types/cobranza';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

const ESTADO_CUENTA_OPTIONS = [
  { label: 'Todos los estados', value: '' },
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Parcial', value: 'parcial' },
  { label: 'Vencida', value: 'vencida' },
  { label: 'Pagadas / Aprobadas', value: 'pagada' },
];

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagada: 'Pagada',
  vencida: 'Vencida',
};

const ESTADO_BADGE: Record<string, 'secondary' | 'warning' | 'success' | 'danger'> = {
  pendiente: 'secondary',
  parcial: 'warning',
  pagada: 'success',
  vencida: 'danger',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

function money(n: number): string {
  return Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminCobranzaPage() {
  const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [kpiSaldo, setKpiSaldo] = useState(0);
  const [kpiVencidas, setKpiVencidas] = useState(0);

  const LIMIT = 20;

  useEffect(() => {
    const fetchCuentas = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: LIMIT.toString(),
        });
        if (search) params.append('q', search);
        if (estadoFilter) params.append('estado_cobranza', estadoFilter);

        const response = await apiClient(`/cobranza?${params.toString()}`);
        const rows: CuentaPorCobrar[] = response.data || [];
        setCuentas(rows);
        setTotal(Number(response.total || 0));
        setKpiSaldo(rows.reduce((sum, c) => sum + Number(c.saldo || 0), 0));
        setKpiVencidas(rows.filter((c) => c.vencida || c.estado_cobranza === 'vencida').length);
      } catch (error) {
        console.error('Error fetching cobranza:', error);
        setCuentas([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCuentas();
  }, [page, search, estadoFilter]);

  const totalPages = Math.max(Math.ceil(total / LIMIT), 1);

  const totalPendiente = cuentas.reduce((sum, c) => sum + Number(c.saldo || 0), 0);
  const cuentasPorVencer = cuentas.filter(
    (c) => !c.vencida && c.estado_cobranza !== 'pagada' && c.dias_atraso === 0,
  ).length;
  const montoPagado = cuentas.reduce((sum, c) => sum + Number(c.pagado || 0), 0);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Por Cobrar</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">S/ {money(totalPendiente || kpiSaldo)}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-100">
              <DollarSign className="h-6 w-6 text-blue-700" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pagado (página)</p>
              <p className="text-2xl font-bold text-green-700 mt-1">S/ {money(montoPagado)}</p>
            </div>
            <div className="p-3 rounded-xl bg-green-100">
              <DollarSign className="h-6 w-6 text-green-700" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Vencidas</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{kpiVencidas}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-100">
              <Clock className="h-6 w-6 text-red-700" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Por Vencer</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{cuentasPorVencer}</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-100">
              <AlertTriangle className="h-6 w-6 text-orange-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, COT-xxx, RUC/DNI..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          <Select
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(String(e.target.value));
              setPage(1);
            }}
            options={ESTADO_CUENTA_OPTIONS}
            className="w-full sm:w-48"
          />
        </div>

        {loading ? (
          <div className="p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 py-4 border-b border-gray-100">
                <div className="h-12 w-12 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : cuentas.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg">No se encontraron cuentas de cobranza</p>
            <p className="text-sm mt-1">Ajusta el filtro o la búsqueda. Con «Todos los estados» también aparecen saldadas (pagadas).</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Documento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vence</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Saldo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Atraso</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cuentas.map((cuenta) => (
                    <tr key={cuenta.id_cotizacion} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">{cuenta.numero}</span>
                        <p className="text-xs text-gray-400">{cuenta.estado_cotizacion?.toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {cuenta.cliente?.nombre || 'Sin cliente'}
                        {cuenta.cliente?.ruc_dni && (
                          <p className="text-xs text-gray-400">{cuenta.cliente.ruc_dni}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(cuenta.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(cuenta.fecha_vencimiento)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ESTADO_BADGE[cuenta.estado_cobranza] || 'neutral'}>
                          {ESTADO_LABELS[cuenta.estado_cobranza] || cuenta.estado_cobranza}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">S/ {money(cuenta.total)}</td>
                      <td className="px-4 py-3 text-right text-sm text-green-700">S/ {money(cuenta.pagado)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-orange-700">S/ {money(cuenta.saldo)}</td>
                      <td className="px-4 py-3">
                        {cuenta.dias_atraso > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <Clock className="h-3 w-3 mr-1" />
                            {cuenta.dias_atraso} días
                          </span>
                        ) : (
                          <span className="text-sm text-green-700">Al día</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/cobranza/${cuenta.id_cotizacion}`}
                          className="text-sm text-primary-700 hover:text-primary-900 font-medium"
                        >
                          Gestionar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Mostrando {((page - 1) * LIMIT) + 1} a {Math.min(page * LIMIT, total)} de {total} cuentas
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700">Página {page} de {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
