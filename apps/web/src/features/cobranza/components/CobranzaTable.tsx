'use client';

import { Search, Download, CreditCard, FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { showToast } from '@/lib/toast';
import {
  Button,
  CobranzaStatusBadge,
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
import { FilterCard, FilterGrid } from '@/components/ui/FilterCard';
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
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialFilters.page ?? 1);
  const [limit, setLimit] = useState(initialFilters.limit ?? 16);
  const [search, setSearch] = useState(initialFilters.q ?? '');
  const searchDebounced = useDebounce(search, 300);
  const [estadoFilter, setEstadoFilter] = useState(initialFilters.estado_cobranza ?? '');
  const [tipoClienteFilter, setTipoClienteFilter] = useState(initialFilters.tipo_cliente ?? '');
  const [moraFilter, setMoraFilter] = useState(initialFilters.mora ?? '');
  const [exporting, setExporting] = useState(false);

  const tieneFiltrosActivos = Boolean(search || estadoFilter || tipoClienteFilter || moraFilter);

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
      setLoadError(false);
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
        setLoadError(true);
        setCuentas([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCuentas();
  }, [page, limit, searchDebounced, estadoFilter, tipoClienteFilter, moraFilter, retry]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Cobranza</h1>
      <FilterCard className="w-full">
        <FilterGrid>
          <div className="flex-[2] min-w-[240px] lg:min-w-[300px]">
            <Input
              variant="filter"
              type="text"
              label="Buscar"
              icon={<Search className="w-4 h-4 text-[#F8B602]" strokeWidth={2} />}
              placeholder="Buscar por documento o cliente..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full"
            />
          </div>

          <div className="flex-1 min-w-[140px] max-w-[195px]">
            <Select
              variant="filter"
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

          <div className="flex-1 min-w-[140px] max-w-[195px]">
            <Select
              variant="filter"
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

          <div className="flex-1 min-w-[140px] max-w-[195px]">
            <Select
              variant="filter"
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

          <div className="shrink-0 flex items-end">
            <Button
              variant="primary"
              className="h-9 px-4 gap-2 whitespace-nowrap"
              aria-label="Exportar cobranza CSV"
              title="Exportar CSV"
              loading={exporting}
              onClick={handleExportar}
            >
              <Download className="size-4 text-white" strokeWidth={2} />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </div>
        </FilterGrid>

        {/* FILTROS ACTIVOS */}
        {tieneFiltrosActivos && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border-default mt-3">
            {search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
                <span className="font-bold">Búsqueda:</span>
                {search.substring(0, 20)}{search.length > 20 ? '...' : ''}
                <button
                  onClick={() => setSearch('')}
                  className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {estadoFilter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
                <span className="font-bold">Estado:</span>
                {ESTADO_CUENTA_OPTIONS.find(o => o.value === estadoFilter)?.label || estadoFilter}
                <button
                  onClick={() => setEstadoFilter('')}
                  className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                  aria-label="Remover estado"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {tipoClienteFilter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
                <span className="font-bold">Tipo cliente:</span>
                {TIPO_CLIENTE_OPTIONS.find(o => o.value === tipoClienteFilter)?.label || tipoClienteFilter}
                <button
                  onClick={() => setTipoClienteFilter('')}
                  className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                  aria-label="Remover tipo de cliente"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {moraFilter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
                <span className="font-bold">Mora:</span>
                {MORA_OPTIONS.find(o => o.value === moraFilter)?.label || moraFilter}
                <button
                  onClick={() => setMoraFilter('')}
                  className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                  aria-label="Remover mora"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

      </FilterCard>

      {loading ? (
        <div className="w-full bg-white rounded-2xl border-2 border-[#E5E7EB] p-12 text-left text-sm text-[#414141]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 py-4 border-b border-[#F3F4F6] last:border-b-0">
              <div className="h-10 w-10 bg-zinc-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-zinc-200 rounded mb-2" />
                <div className="h-3 w-1/2 bg-zinc-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div role="alert" className="w-full bg-white rounded-2xl border-2 border-[#E5E7EB] p-8 text-center space-y-3">
          <p className="text-sm text-[#414141]">No se pudieron cargar las cuentas de cobranza.</p>
          <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
            Reintentar
          </Button>
        </div>
      ) : cuentas.length === 0 ? (
        <div className="w-full bg-white rounded-2xl border-2 border-[#E5E7EB] p-12 text-center text-[#575757]">
          <FileText className="h-12 w-12 mx-auto text-zinc-300 mb-4" />
          <p className="text-lg font-medium text-[#414141]">No se encontraron cuentas de cobranza</p>
          <p className="text-sm mt-1">Ajusta los filtros o la búsqueda.</p>
        </div>
      ) : (
        <Table
          footer={
            total > 0 ? (
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
            ) : undefined
          }
        >
          <TableHeader>
            <TableRow>
              <TableHead className="w-[16%] whitespace-nowrap">DOCUMENTO</TableHead>
              <TableHead className="w-[28%]">CLIENTE</TableHead>
              <TableHead className="w-[16%] whitespace-nowrap">FECHA</TableHead>
              <TableHead className="w-[18%] text-center whitespace-nowrap">ESTADO</TableHead>
              <TableHead className="w-[14%] text-right whitespace-nowrap">TOTAL</TableHead>
              <TableHead className="w-[8%] text-right whitespace-nowrap">ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuentas.map((cuenta) => (
              <TableRow key={cuenta.id_cotizacion}>
                <TableCell className="font-normal text-[#575757] whitespace-nowrap">
                  {cuenta.numero}
                </TableCell>
                <TableCell className="text-[#414141] truncate">
                  {cuenta.cliente?.nombre || 'Sin cliente'}
                </TableCell>
                <TableCell className="text-[#575757] whitespace-nowrap">
                  {formatDate(cuenta.created_at)}
                </TableCell>
                <TableCell className="text-center whitespace-nowrap">
                  <CobranzaStatusBadge
                    estado={cuenta.estado_cobranza}
                    diasAtraso={cuenta.dias_atraso}
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">
                  S/ {money(cuenta.total)}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/cobranza/${cuenta.id_cotizacion}`)}
                    title="Gestionar"
                    aria-label={`Gestionar pago de ${cuenta.numero}`}
                    className="h-8 w-8 p-0 text-zinc-600 hover:text-black inline-flex items-center justify-center"
                  >
                    <CreditCard className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}