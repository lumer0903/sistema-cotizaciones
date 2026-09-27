'use client';

import { Search, Download, CreditCard, Clock, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CuentaPorCobrar } from '@/types/cobranza';
import { useDebounce } from '@/hooks/useDebounce';
import { Button, Input, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';

const ESTADO_CUENTA_OPTIONS = [
  { label: 'Todos los estados', value: '' },
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Parcial', value: 'parcial' },
  { label: 'Pagada', value: 'pagada' },
  { label: 'Vencida', value: 'vencida' },
];

const TIPO_CLIENTE_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Distribuidor', value: 'distribuidor' },
  { label: 'Tienda', value: 'tienda' },
];

const MORA_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Al día', value: 'al_dia' },
  { label: 'Con atraso / Vencido', value: 'con_atraso' },
];

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'PENDIENTE',
  parcial: 'PARCIAL',
  pagada: 'PAGADA',
  vencida: 'VENCIDA',
};

const ESTADO_BADGE_CLASS: Record<string, string> = {
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  parcial: 'bg-blue-50 text-blue-700 border-blue-200',
  pagada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  vencida: 'bg-rose-50 text-rose-700 border-rose-200',
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
  const searchDebounced = useDebounce(search, 300);
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [tipoClienteFilter, setTipoClienteFilter] = useState<string>('');
  const [moraFilter, setMoraFilter] = useState<string>('');

  const LIMIT = 20;

  useEffect(() => {
    const fetchCuentas = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: LIMIT.toString(),
        });
        if (searchDebounced) params.append('q', searchDebounced);
        if (estadoFilter) params.append('estado_cobranza', estadoFilter);
        if (tipoClienteFilter) params.append('tipo_cliente', tipoClienteFilter);
        if (moraFilter) params.append('mora', moraFilter);

        const response = await apiClient(`/cobranza?${params.toString()}`);
        const rows: CuentaPorCobrar[] = response.data || [];
        setCuentas(rows);
        setTotal(Number(response.total || 0));
      } catch (error) {
        console.error('Error fetching cobranza:', error);
        setCuentas([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCuentas();
  }, [page, searchDebounced, estadoFilter, tipoClienteFilter, moraFilter]);

  const totalPages = Math.max(Math.ceil(total / LIMIT), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cobranza</h1>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Cobranzas
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Buscar cliente, RUC o N° Documento..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10"
          />
        </div>
        <Select
          value={estadoFilter}
          onChange={(e) => {
            setEstadoFilter(String(e.target.value));
            setPage(1);
          }}
          options={ESTADO_CUENTA_OPTIONS}
          className="w-full"
        />
        <Select
          value={tipoClienteFilter}
          onChange={(e) => {
            setTipoClienteFilter(String(e.target.value));
            setPage(1);
          }}
          options={TIPO_CLIENTE_OPTIONS}
          className="w-full"
        />
        <Select
          value={moraFilter}
          onChange={(e) => {
            setMoraFilter(String(e.target.value));
            setPage(1);
          }}
          options={MORA_OPTIONS}
          className="w-full"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-4 sm:p-6">
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
            <p className="text-sm mt-1">Ajusta los filtros o la búsqueda.</p>
          </div>
        ) : (
          <>
            <div className="w-full">
              <Table wrapperClassName="border-0 shadow-none rounded-none min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Atraso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuentas.map((cuenta) => (
                    <TableRow 
                      key={cuenta.id_cotizacion}
                      className="hover:bg-amber-50/40 transition-colors duration-150"
                    >
                      <TableCell>
                        <span className="text-sm font-medium text-gray-900">{cuenta.numero}</span>
                        <p className="text-xs text-gray-500">{cuenta.estado_cotizacion?.toUpperCase()}</p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">
                        {cuenta.cliente?.nombre || 'Sin cliente'}
                        {cuenta.cliente?.ruc_dni && (
                          <p className="text-xs text-gray-500">{cuenta.cliente.ruc_dni}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(cuenta.created_at)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(cuenta.fecha_vencimiento)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold border ${ESTADO_BADGE_CLASS[cuenta.estado_cobranza] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                          {ESTADO_LABELS[cuenta.estado_cobranza] || cuenta.estado_cobranza.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-900">S/ {money(cuenta.total)}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-emerald-700">S/ {money(cuenta.pagado)}</TableCell>
                      <TableCell className={`text-right text-sm font-bold ${Number(cuenta.saldo) > 0 ? 'text-brand-ink' : 'text-gray-900'}`}>S/ {money(cuenta.saldo)}</TableCell>
                      <TableCell>
                        {cuenta.dias_atraso > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
                            <Clock className="h-3 w-3 mr-1" />
                            {cuenta.dias_atraso} días
                          </span>
                        ) : (
                          <span className="text-sm text-emerald-700">Al día</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/cobranza/${cuenta.id_cotizacion}`} passHref>
                          <Button size="sm" variant="outline" className="gap-2">
                            <CreditCard className="h-4 w-4" />
                            Gestionar
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Paginación fuera del contenedor con scroll horizontal */}
      {!loading && cuentas.length > 0 && totalPages > 1 && (
        <div className="px-1 py-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Mostrando {((page - 1) * LIMIT) + 1} a {Math.min(page * LIMIT, total)} de {total} cuentas
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              aria-label="Página anterior"
              className="min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="text-sm text-gray-700" aria-live="polite">Página {page} de {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              aria-label="Página siguiente"
              className="min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

