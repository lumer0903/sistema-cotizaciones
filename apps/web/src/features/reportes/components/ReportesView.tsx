'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, RefreshCw, FileText, BarChart2, Users, X } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { getUsuarios, type UsuarioLista } from '@/features/usuarios/api/usuariosApi';
import type { Almacen, Cliente } from '@goldcontinent/shared/types';
import {
  fetchRankingProductos,
  fetchAntiguedadDeuda,
  fetchAuditoriaIa,
  toCSV,
  downloadBlob,
} from '@/features/reportes/api/reportes';
import type {
  FiltrosReporte,
  RankingProducto,
  AntiguedadDeuda,
  AuditoriaIa,
  TipoReporte,
} from '@/features/reportes/types';
import { FilterCard, FilterGrid } from '@/components/ui/FilterCard';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableBadge } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { showToast } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';

const TAKE = 20;

const REPORTE_CONFIG: Record<TipoReporte, { label: string; icon: React.ReactNode; description: string }> = {
  'ranking-productos': {
    label: 'Ranking Productos',
    icon: <BarChart2 className="w-4 h-4" />,
    description: 'Productos más vendidos por cantidad e ingreso',
  },
  'antiguedad-deuda': {
    label: 'Antigüedad Deuda',
    icon: <Users className="w-4 h-4" />,
    description: 'Cuentas por cobrar agrupadas por rango de días',
  },
  'auditoria-ia': {
    label: 'Auditoría IA',
    icon: <FileText className="w-4 h-4" />,
    description: 'Historial de sugerencias IA y acciones del usuario',
  },
};

const RANKING_HEADERS: Record<keyof RankingProducto, string> = {
  idProducto: 'ID',
  codigo: 'Código',
  descripcion: 'Producto',
  cantidadVendida: 'Cant. Vendida',
  ingresoTotal: 'Ingreso Total (S/)',
  numeroCotizaciones: 'Nº Cotizaciones',
};

const DEUDA_HEADERS: Record<keyof AntiguedadDeuda, string> = {
  idCliente: 'ID',
  cliente: 'Cliente',
  rucDni: 'RUC/DNI',
  totalPendiente: 'Total Pendiente (S/)',
  d0_30: '0-30 días',
  d31_60: '31-60 días',
  d61_90: '61-90 días',
  d90mas: '90+ días',
  diasCreditoDefecto: 'Días Crédito',
  diasGracia: 'Días Gracia',
};

const IA_HEADERS: Record<keyof AuditoriaIa, string> = {
  idInteraccion: 'ID',
  createdAt: 'Fecha',
  tipoSugerencia: 'Tipo Sugerencia',
  accionUsuario: 'Acción Usuario',
  productoOriginal: 'Producto Original',
  productoSugerido: 'Producto Sugerido',
  idCotizacion: 'Nº Cotización',
  vendedor: 'Vendedor',
};

export function ReportesView() {
  const { isAdmin } = usePermissions();

  // Estado global
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('ranking-productos');
  const [filtros, setFiltros] = useState<FiltrosReporte>({});
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMetas, setLoadingMetas] = useState(true);

  const tieneFiltrosActivos = Boolean(filtros.fechaInicio || filtros.fechaFin || filtros.idVendedor || filtros.idAlmacen || filtros.idCliente);

  // Metadatos para selects
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [vendedores, setVendedores] = useState<UsuarioLista[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Datos de reportes
  const [rankingData, setRankingData] = useState<{ data: RankingProducto[]; total: number }>({ data: [], total: 0 });
  const [deudaData, setDeudaData] = useState<{ data: AntiguedadDeuda[]; total: number }>({ data: [], total: 0 });
  const [iaData, setIaData] = useState<{ data: AuditoriaIa[]; total: number }>({ data: [], total: 0 });

  // Cargar metadatos para filtros
  const cargarMetadatos = useCallback(async () => {
    try {
      const [resAlm, resUsu, resCli] = await Promise.all([
        apiClient('/almacenes?activo=true&limit=100').catch(() => ({ data: [] })),
        getUsuarios({ limit: 100 }).catch(() => ({ data: [] })),
        apiClient('/clientes?activo=true&limit=100').catch(() => ({ data: [] })),
      ]);
      setAlmacenes(Array.isArray(resAlm?.data) ? resAlm.data : []);
      const usuarios = Array.isArray(resUsu?.data) ? resUsu.data : [];
      setVendedores(usuarios.filter((u) => u.rol === 'vendedor' && u.activo));
      setClientes(Array.isArray(resCli?.data) ? resCli.data : []);
    } catch (e) {
      console.error('Error cargando metadatos:', e);
    } finally {
      setLoadingMetas(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount is standard data fetching pattern
    cargarMetadatos();
  }, [cargarMetadatos]);

  // Fetch actual según reporte activo
  const fetchActual = useCallback(async (resetPagination = false) => {
    if (resetPagination) setSkip(0);
    setLoading(true);
    try {
      switch (tipoReporte) {
        case 'ranking-productos': {
          const res = await fetchRankingProductos(filtros, TAKE, skip);
          setRankingData(res);
          break;
        }
        case 'antiguedad-deuda': {
          const res = await fetchAntiguedadDeuda(filtros, TAKE, skip);
          setDeudaData(res);
          break;
        }
        case 'auditoria-ia': {
          const res = await fetchAuditoriaIa(filtros, TAKE, skip);
          setIaData(res);
          break;
        }
      }
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  }, [tipoReporte, filtros, skip]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount/dependency change
    fetchActual(true);
  }, [fetchActual]);

  // Helpers de paginación
  const totalActual = useMemo((): number => {
    switch (tipoReporte) {
      case 'ranking-productos': return rankingData.total;
      case 'antiguedad-deuda': return deudaData.total;
      case 'auditoria-ia': return iaData.total;
      default: return 0;
    }
  }, [tipoReporte, rankingData.total, deudaData.total, iaData.total]);

  const dataActual = useMemo((): (RankingProducto | AntiguedadDeuda | AuditoriaIa)[] => {
    switch (tipoReporte) {
      case 'ranking-productos': return rankingData.data;
      case 'antiguedad-deuda': return deudaData.data;
      case 'auditoria-ia': return iaData.data;
      default: return [];
    }
  }, [tipoReporte, rankingData.data, deudaData.data, iaData.data]);

  const totalPages = Math.ceil(totalActual / TAKE) || 1;
  const currentPage = Math.floor(skip / TAKE) + 1;

  const handlePageChange = (page: number) => {
    setSkip((page - 1) * TAKE);
  };

  const handleFiltroChange = (key: string, value: string | number | undefined) => {
    setFiltros((prev: FiltrosReporte) => ({ ...prev, [key]: value as any }));
  };

  const handleExport = async () => {
    try {
      const blob = await (async (): Promise<Blob> => {
        switch (tipoReporte) {
          case 'ranking-productos': {
            const res = await fetchRankingProductos(filtros, 50, 0);
            return new Blob([toCSV(res.data, RANKING_HEADERS)], { type: 'text/csv;charset=utf-8;' });
          }
          case 'antiguedad-deuda': {
            const res = await fetchAntiguedadDeuda(filtros, 50, 0);
            return new Blob([toCSV(res.data, DEUDA_HEADERS)], { type: 'text/csv;charset=utf-8;' });
          }
          case 'auditoria-ia': {
            const res = await fetchAuditoriaIa(filtros, 50, 0);
            return new Blob([toCSV(res.data, IA_HEADERS)], { type: 'text/csv;charset=utf-8;' });
          }
          default:
            return new Blob([''], { type: 'text/csv;charset=utf-8;' });
        }
      })();

      const fecha = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `${tipoReporte}-${fecha}.csv`);
      showToast.success('Reporte exportado correctamente');
    } catch {
      showToast.error('Error al exportar el reporte');
    }
  };

  const almacenOptions = almacenes.map((a) => ({ label: a.nombre, value: a.id_almacen }));
  const vendedorOptions = vendedores.map((v) => ({ label: v.nombre, value: v.id_usuario }));
  const clienteOptions = clientes.map((c) => ({ label: c.nombre, value: c.id_cliente }));

  // Render filas según tipo
  const renderRows = () => {
    switch (tipoReporte) {
      case 'ranking-productos':
        return (dataActual as RankingProducto[]).map((row) => (
          <TableRow key={row.idProducto}>
            <TableCell className="font-mono whitespace-nowrap text-[#575757]">{row.codigo}</TableCell>
            <TableCell className="max-w-xs truncate">{row.descripcion}</TableCell>
            <TableCell className="text-right tabular-nums whitespace-nowrap">{row.cantidadVendida.toLocaleString()}</TableCell>
            <TableCell className="text-right tabular-nums whitespace-nowrap font-semibold">
              {Number(row.ingresoTotal).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </TableCell>
            <TableCell className="text-right tabular-nums whitespace-nowrap">{row.numeroCotizaciones}</TableCell>
          </TableRow>
        ));
      case 'antiguedad-deuda':
        return (dataActual as AntiguedadDeuda[]).map((row) => (
          <TableRow key={row.idCliente}>
            <TableCell className="max-w-xs truncate">{row.cliente}</TableCell>
            <TableCell className="whitespace-nowrap">{row.rucDni ?? '-'}</TableCell>
            <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">{Number(row.totalPendiente).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
            <TableCell className="text-right tabular-nums whitespace-nowrap">{Number(row.d0_30).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
            <TableCell className="text-right tabular-nums whitespace-nowrap">{Number(row.d31_60).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
            <TableCell className="text-right tabular-nums whitespace-nowrap">{Number(row.d61_90).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
            <TableCell className="text-right text-danger font-medium tabular-nums whitespace-nowrap">{Number(row.d90mas).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
          </TableRow>
        ));
      case 'auditoria-ia':
        return (dataActual as AuditoriaIa[]).map((row) => (
          <TableRow key={row.idInteraccion}>
            <TableCell className="whitespace-nowrap">{new Date(row.createdAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
            <TableCell className="whitespace-nowrap">{row.tipoSugerencia ?? '-'}</TableCell>
            <TableCell className="text-center whitespace-nowrap">
              {(() => {
                const accion = (row.accionUsuario ?? '').toUpperCase();
                const esAceptado = accion === 'ACEPTADO' || accion === 'ACEPTADA';
                const esRechazado = accion === 'RECHAZADO' || accion === 'RECHAZADA';
                return (
                  <TableBadge variant={esAceptado ? 'success' : esRechazado ? 'danger' : 'neutral'}>
                    {row.accionUsuario ?? '-'}
                  </TableBadge>
                );
              })()}
            </TableCell>
            <TableCell className="max-w-xs truncate">{row.productoOriginal ?? '-'}</TableCell>
            <TableCell className="max-w-xs truncate">{row.productoSugerido ?? '-'}</TableCell>
            <TableCell className="text-right whitespace-nowrap">{row.idCotizacion ?? '-'}</TableCell>
            <TableCell className="whitespace-nowrap">{row.vendedor ?? '-'}</TableCell>
          </TableRow>
        ));
    }
  };

  const renderHeaders = () => {
    switch (tipoReporte) {
      case 'ranking-productos':
        return (
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cant. Vendida</TableHead>
              <TableHead className="text-right">Ingreso Total (S/)</TableHead>
              <TableHead className="text-right">Nº Cotizaciones</TableHead>
            </TableRow>
          </TableHeader>
        );
      case 'antiguedad-deuda':
        return (
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>RUC/DNI</TableHead>
              <TableHead className="text-right">Total Pendiente</TableHead>
              <TableHead className="text-right">0-30 días</TableHead>
              <TableHead className="text-right">31-60 días</TableHead>
              <TableHead className="text-right">61-90 días</TableHead>
              <TableHead className="text-right text-danger">90+ días</TableHead>
            </TableRow>
          </TableHeader>
        );
      case 'auditoria-ia':
        return (
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo Sugerencia</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Producto Original</TableHead>
              <TableHead>Producto Sugerido</TableHead>
              <TableHead className="text-right">Nº Cotización</TableHead>
              <TableHead>Vendedor</TableHead>
            </TableRow>
          </TableHeader>
        );
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Reportes</h1>

      {/* Filtros */}
      <FilterCard className="w-full">
        <FilterGrid>
            <div className="flex-1 min-w-[140px] max-w-[195px]">
              <Input
                label="Fecha inicio"
                type="date"
                value={filtros.fechaInicio ?? ''}
                onChange={(e) => handleFiltroChange('fechaInicio', e.target.value || undefined)}
                disabled={loadingMetas}
              />
            </div>
            <div className="flex-1 min-w-[140px] max-w-[195px]">
              <Input
                label="Fecha fin"
                type="date"
                value={filtros.fechaFin ?? ''}
                onChange={(e) => handleFiltroChange('fechaFin', e.target.value || undefined)}
                disabled={loadingMetas}
              />
            </div>
            {isAdmin && (
              <div className="flex-1 min-w-[140px] max-w-[195px]">
                <Select
                  label="Vendedor"
                  value={filtros.idVendedor ? String(filtros.idVendedor) : ''}
                  onChange={(e) => handleFiltroChange('idVendedor', e.target.value ? Number(e.target.value) : undefined)}
                  options={[{ label: 'Todos', value: '' }, ...vendedorOptions]}
                  disabled={loadingMetas}
                  placeholder="Todos"
                />
              </div>
            )}
            <div className="flex-1 min-w-[140px] max-w-[195px]">
              <Select
                label="Almacén"
                value={filtros.idAlmacen ? String(filtros.idAlmacen) : ''}
                onChange={(e) => handleFiltroChange('idAlmacen', e.target.value ? Number(e.target.value) : undefined)}
                options={[{ label: 'Todos', value: '' }, ...almacenOptions]}
                disabled={loadingMetas}
                placeholder="Todos"
              />
            </div>
            <div className="flex-1 min-w-[140px] max-w-[195px]">
              <Select
                label="Cliente"
                value={filtros.idCliente ? String(filtros.idCliente) : ''}
                onChange={(e) => handleFiltroChange('idCliente', e.target.value ? Number(e.target.value) : undefined)}
                options={[{ label: 'Todos', value: '' }, ...clienteOptions]}
                disabled={loadingMetas}
                placeholder="Todos"
              />
            </div>
          <div className="shrink-0 flex items-end">
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={dataActual.length === 0}
              className="h-9 px-4 gap-2 whitespace-nowrap"
            >
              <Download className="size-4 text-white" strokeWidth={2} aria-hidden="true" />
              <span>Exportar CSV</span>
            </Button>
          </div>
        </FilterGrid>
      
      {/* FILTROS ACTIVOS */}
      {tieneFiltrosActivos && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border-default mt-3">
          {filtros.fechaInicio && filtros.fechaFin && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
              <span className="font-bold">Rango:</span>
              {filtros.fechaInicio.split('-').reverse().join('/')} - {filtros.fechaFin.split('-').reverse().join('/')}
              <button
                onClick={() => setFiltros((prev) => ({ ...prev, fechaInicio: undefined, fechaFin: undefined }))}
                className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                aria-label="Remover rango de fechas"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filtros.idVendedor && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
              <span className="font-bold">Vendedor:</span>
              {(vendedores.find(v => v.id_usuario === filtros.idVendedor)?.nombre || filtros.idVendedor)}
              <button
                onClick={() => setFiltros((prev) => ({ ...prev, idVendedor: undefined }))}
                className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                aria-label="Remover vendedor"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filtros.idAlmacen && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
              <span className="font-bold">Almacén:</span>
              {(almacenes.find(a => a.id_almacen === filtros.idAlmacen)?.nombre || filtros.idAlmacen)}
              <button
                onClick={() => setFiltros((prev) => ({ ...prev, idAlmacen: undefined }))}
                className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                aria-label="Remover almacén"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filtros.idCliente && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
              <span className="font-bold">Cliente:</span>
              {(clientes.find(c => c.id_cliente === filtros.idCliente)?.nombre || filtros.idCliente)}
              <button
                onClick={() => setFiltros((prev) => ({ ...prev, idCliente: undefined }))}
                className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                aria-label="Remover cliente"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
      
      </FilterCard>

      {/* Tabs de reportes */}
      <Tabs value={tipoReporte} onValueChange={(v: string) => setTipoReporte(v as TipoReporte)} className="w-full">
        <TabsList className="flex w-full max-w-full overflow-x-auto" aria-label="Tipo de reporte">
          {(Object.keys(REPORTE_CONFIG) as TipoReporte[]).map((tipo) => (
            <TabsTrigger key={tipo} value={tipo} className="gap-2">
              {REPORTE_CONFIG[tipo].icon}
              {REPORTE_CONFIG[tipo].label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="ranking-productos" className="mt-4">
          <Table
            footer={
              totalPages > 1 ? (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalActual}
                  limit={TAKE}
                  onPageChange={handlePageChange}
                  onLimitChange={() => {}}
                  itemLabel="registros"
                />
              ) : undefined
            }
          >
            {renderHeaders()}
            <TableBody>
              {dataActual.length > 0 ? renderRows() : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-[#575757]">
                    No hay datos para los filtros seleccionados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="antiguedad-deuda" className="mt-4">
          <Table
            footer={
              totalPages > 1 ? (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalActual}
                  limit={TAKE}
                  onPageChange={handlePageChange}
                  onLimitChange={() => {}}
                  itemLabel="clientes"
                />
              ) : undefined
            }
          >
            {renderHeaders()}
            <TableBody>
              {dataActual.length > 0 ? renderRows() : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-[#575757]">
                    No hay datos para los filtros seleccionados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="auditoria-ia" className="mt-4">
          <Table
            footer={
              totalPages > 1 ? (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalActual}
                  limit={TAKE}
                  onPageChange={handlePageChange}
                  onLimitChange={() => {}}
                  itemLabel="registros"
                />
              ) : undefined
            }
          >
            {renderHeaders()}
            <TableBody>
              {dataActual.length > 0 ? renderRows() : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-[#575757]">
                    No hay datos para los filtros seleccionados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="flex items-center justify-center py-4" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-accent-ink">
            <RefreshCw className="w-6 h-6 animate-spin" aria-hidden="true" />
            <span>Cargando reporte...</span>
          </div>
        </div>
      )}
    </div>
  );
}
