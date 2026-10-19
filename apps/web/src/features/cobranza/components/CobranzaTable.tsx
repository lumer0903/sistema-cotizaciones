'use client';

import { Search, Download, CreditCard, Clock, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { showToast } from '@/lib/toast';
import {
  Button,
  Badge,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
} from '@/components/ui';
import { FilterCard } from '@/components/ui/FilterCard';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { CuentaPorCobrar } from '@/features/cobranza/types';
import { fetchCobranza, fetchCobranzaForExport, type CobranzaFilters } from '@/features/cobranza/api/cobranza';

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

const ESTADO_BADGE: Record<string, { variant: BadgeVariant; className?: string }> = {
  pendiente: { variant: 'neutral', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  parcial: { variant: 'parcial' },
  pagada: { variant: 'aprobado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  vencida: { variant: 'rechazado', className: 'bg-rose-50 text-rose-700 border-rose-200' },
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

function csvCell(v: unknown): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

interface CobranzaTableProps {
  initialFilters?: Partial<CobranzaFilters>;
}

export function CobranzaTable({ initialFilters = {} }: CobranzaTableProps) {
  const router = useRouter();
  const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialFilters.page ?? 1);
  const [limit, setLimit] = useState(initialFilters.limit ?? 16);
  const [search, setSearch] = useState(initialFilters.q ?? '');
  const searchDebounced = useDebounce(search, 300);
  const [estadoFilter, setEstadoFilter] = useState(initialFilters.estado_cobranza ?? '');
  const [tipoClienteFilter, setTipoClienteFilter] = useState(initialFilters.tipo_cliente ?? '');
  const [moraFilter, setMoraFilter] = useState(initialFilters.mora ?? '');
  const [exporting, setExporting] = useState(false);

  const handleExportar = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = await fetchCobranzaForExport({
        q: searchDebounced,
        estado_cobranza: estadoFilter,
        tipo_cliente: tipoClienteFilter,
        mora: moraFilter,
      });

      if (rows.length === 0) {
        showToast.warning('No hay cuentas de cobranza para exportar con los filtros actuales.');
        return;
      }

      const header = [
        'Documento', 'Cliente', 'RUC/DNI', 'Fecha', 'Vencimiento',
        'Estado', 'Total (S/)', 'Pagado (S/)', 'Saldo (S/)', 'Días de atraso',
      ];
      const lineas = rows.map((c) =>
        [
          c.numero,
          c.cliente?.nombre || '',
          c.cliente?.ruc_dni || '',
          formatDate(c.created_at),
          formatDate(c.fecha_vencimiento),
          ESTADO_LABELS[c.estado_cobranza] || c.estado_cobranza,
          money(c.total),
          money(c.pagado),
          money(c.saldo),
          c.dias_atraso || 0,
        ].map(csvCell).join(';'),
      );
      const csv = '\uFEFF' + [header.map(csvCell).join(';'), ...lineas].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cobranza-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast.success(`Exportadas ${rows.length} cuentas de cobranza (CSV).`);
    } catch (error) {
      console.error('Error exportando cobranza:', error);
      showToast.error('No se pudo exportar la cobranza. Intente nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const fetchCuentas = async () => {
      setLoading(true);
      try {
        const response = await fetchCobranza({
          page,
          limit,
          q: searchDebounced,
          estado_cobranza: estadoFilter,
          tipo_cliente: tipoClienteFilter,
          mora: moraFilter,
        });
        setCuentas(response.data);
        setTotal(response.total);
      } catch (error) {
        console.error('Error fetching cobranza:', error);
        setCuentas([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCuentas();
  }, [page, limit, searchDebounced, estadoFilter, tipoClienteFilter, moraFilter]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Cobranza</h1>
      <FilterCard className="w-full">
        <div className="flex flex-col md:flex-row items-stretch md:items-end gap-x-6 gap-y-4 w-full">
          <div className="flex-[2] min-w-[220px]">
            <Input
              type="text"
              label="Buscar"
              icon={<Search className="w-4 h-4" />}
              placeholder="Buscar"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full"
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <Select
              label="Estado"
              value={estadoFilter}
              onChange={(e) => {
                setEstadoFilter(String(e.target.value));
                setPage(1);
              }}
              options={ESTADO_CUENTA_OPTIONS}
              className="w-full"
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <Select
              label="Tipo de cliente"
              value={tipoClienteFilter}
              onChange={(e) => {
                setTipoClienteFilter(String(e.target.value));
                setPage(1);
              }}
              options={TIPO_CLIENTE_OPTIONS}
              className="w-full"
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <Select
              label="Mora"
              value={moraFilter}
              onChange={(e) => {
                setMoraFilter(String(e.target.value));
                setPage(1);
              }}
              options={MORA_OPTIONS}
              className="w-full"
            />
          </div>

          <div className="w-full md:w-auto">
            <Button
              variant="outline"
              className="w-full md:w-auto gap-2"
              loading={exporting}
              onClick={handleExportar}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </FilterCard>

      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden overflow-x-auto w-full">
        {loading ? (
          <div className="p-4 sm:p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 py-4 border-b border-zinc-100">
                <div className="h-12 w-12 bg-zinc-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 w-3/4 bg-zinc-200 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-zinc-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : cuentas.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <FileText className="h-12 w-12 mx-auto text-zinc-300 mb-4" />
            <p className="text-lg">No se encontraron cuentas de cobranza</p>
            <p className="text-sm mt-1">Ajusta los filtros o la búsqueda.</p>
          </div>
        ) : (
          <div className="w-full">
            <Table className="w-full" wrapperClassName="w-full border-0 shadow-none rounded-none">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[15%]">Documento</TableHead>
                  <TableHead className="w-[20%]">Cliente</TableHead>
                  <TableHead className="w-[15%]">Fecha</TableHead>
                  <TableHead className="w-[15%]">Estado</TableHead>
                  <TableHead className="w-[15%] text-center">Total</TableHead>
                  <TableHead className="w-[10%]">Atraso</TableHead>
                  <TableHead className="w-[10%] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuentas.map((cuenta) => (
                  <TableRow key={cuenta.id_cotizacion}>
                    <TableCell className="font-medium text-zinc-900">
                      {cuenta.numero}
                    </TableCell>
                    <TableCell className="text-zinc-900">
                      {cuenta.cliente?.nombre || 'Sin cliente'}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {formatDate(cuenta.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={ESTADO_BADGE[cuenta.estado_cobranza]?.variant ?? 'neutral'}
                        size="estado"
                        className={ESTADO_BADGE[cuenta.estado_cobranza]?.className}
                      >
                        {ESTADO_LABELS[cuenta.estado_cobranza] || cuenta.estado_cotizacion?.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium text-zinc-900 tnum">
                      S/ {money(cuenta.total)}
                    </TableCell>

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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/cobranza/${cuenta.id_cotizacion}`)}
                        title="Gestionar"
                        aria-label={`Gestionar pago de ${cuenta.numero}`}
                        className="p-2 text-accent-ink hover:text-accent-primary"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {!loading && cuentas.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(n) => {
            setLimit(n);
            setPage(1);
          }}
          loading={loading}
          itemLabel="cuentas"
        />
      )}
    </div>
  );
}