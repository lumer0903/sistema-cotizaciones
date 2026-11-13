'use client';

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getCotizaciones } from '@/features/cotizaciones/api/cotizacionApi';
import { EstadoCotizacion } from '@/features/cotizaciones/types/cotizacion';
import { CotizacionesTable } from '@/features/cotizaciones/components/CotizacionesTable';
import { useDebounce } from '@/hooks/useDebounce';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { FilterCard, FilterGrid } from '@/components/ui/FilterCard';
import { Pagination } from '@/components/ui/Pagination';

const ESTADO_OPTIONS = [
  { label: 'Seleccionar', value: 'TODOS' },
  { label: 'BORRADOR', value: 'BORRADOR' },
  { label: 'ENVIADO', value: 'ENVIADO' },
  { label: 'PARCIALMENTE PAGADA', value: 'PARCIALMENTE_PAGADA' },
  { label: 'APROBADO', value: 'APROBADO' },
  { label: 'RECHAZADO', value: 'RECHAZADO' },
];

const TIPO_OPTIONS = [
  { label: 'Todos los tipos', value: 'TODOS' },
  { label: 'DISTRIBUIDOR', value: 'DISTRIBUIDOR' },
  { label: 'TIENDA', value: 'TIENDA' },
];

export default function MisCotizacionesPage() {
  const router = useRouter();

  // Estados de Filtros
  const [buscar, setBuscar] = useState('');
  const buscarDebounced = useDebounce(buscar, 300);
  const [fecha, setFecha] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoCotizacion | 'TODOS'>('TODOS');
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | 'DISTRIBUIDOR' | 'TIENDA'>('TODOS');

  // Paginación (local: el servidor devuelve hasta 1000 y se pagina en cliente)
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(8);

  const [prevFiltros, setPrevFiltros] = useState({ buscarDebounced, fecha, estadoFilter, tipoFilter, limit });

  // Consulta reactiva con TanStack Query: se sincroniza y refresca al instante con invalidateQueries
  const { data: res, isLoading: loading } = useQuery({
    queryKey: ['cotizaciones', { buscar: buscarDebounced, fecha, estado: estadoFilter }],
    queryFn: () =>
      getCotizaciones({
        buscar: buscarDebounced,
        fecha,
        estado: estadoFilter,
        limit: 1000,
      }),
  });

  const cotizaciones = useMemo(() => res?.data ?? [], [res]);

  // Reset page when filters change
  if (
    prevFiltros.buscarDebounced !== buscarDebounced ||
    prevFiltros.fecha !== fecha ||
    prevFiltros.estadoFilter !== estadoFilter ||
    prevFiltros.tipoFilter !== tipoFilter ||
    prevFiltros.limit !== limit
  ) {
    setPrevFiltros({ buscarDebounced, fecha, estadoFilter, tipoFilter, limit });
    setCurrentPage(1);
  }

  // Filtro de tipo + paginación local
  const filteredCotizaciones = useMemo(
    () =>
      tipoFilter === 'TODOS'
        ? cotizaciones
        : cotizaciones.filter((c) => c.tipo === tipoFilter),
    [cotizaciones, tipoFilter],
  );

  const totalItems = filteredCotizaciones.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const pageData = useMemo(
    () => filteredCotizaciones.slice((currentPage - 1) * limit, currentPage * limit),
    [filteredCotizaciones, currentPage, limit],
  );

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Cotizaciones</h1>
      {/* Barra de Filtros (contenedor base FilterCard) */}
      <FilterCard>
        <FilterGrid>
          {/* BUSCAR */}
          <div className="flex-[1.5] min-w-[220px]">
            <Input
              label="Buscar"
              type="text"
              icon={<Search className="w-4 h-4" />}
              value={buscar}
              onChange={(e) => {
                setBuscar(e.target.value);
              }}
              placeholder="Buscar por código o cliente..."
            />
          </div>

          {/* FECHA */}
          <div className="flex-1 min-w-[150px]">
            <Input
              label="Fecha"
              type="date"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
              }}
            />
          </div>

          {/* ESTADO */}
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Estado"
              value={estadoFilter}
              onChange={(e) => {
                setEstadoFilter(String(e.target.value) as EstadoCotizacion | 'TODOS');
              }}
              options={ESTADO_OPTIONS}
              className="w-full"
            />
          </div>

          {/* TIPO DE CLIENTE */}
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Tipo de cliente"
              value={tipoFilter}
              onChange={(e) => {
                setTipoFilter(String(e.target.value) as 'TODOS' | 'DISTRIBUIDOR' | 'TIENDA');
              }}
              options={TIPO_OPTIONS}
              className="w-full"
            />
          </div>
        </FilterGrid>
      </FilterCard>

      {/* Tabla con paginación integrada en footer */}
      <CotizacionesTable
        data={pageData}
        loading={loading}
        onEdit={(id) => router.push(`/cotizaciones/editar/${id}`)}
        onView={(id) => router.push(`/cotizaciones/pdf/${id}`)}
        footer={
          !loading && totalItems > 0 ? (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              limit={limit}
              onPageChange={setCurrentPage}
              onLimitChange={setLimit}
              itemLabel="cotizaciones"
            />
          ) : undefined
        }
      />
    </div>
  );
}