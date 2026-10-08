'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { getCotizaciones } from '@/features/cotizaciones/api/cotizacionApi';
import { CotizacionItem, EstadoCotizacion } from '@/features/cotizaciones/types/cotizacion';
import { CotizacionesTable } from '@/features/cotizaciones/components/CotizacionesTable';
import { useDebounce } from '@/hooks/useDebounce';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { FilterCard } from '@/components/ui/FilterCard';
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

  // Estados de Datos
  const [cotizaciones, setCotizaciones] = useState<CotizacionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Paginación (local: el servidor devuelve hasta 1000 y se pagina en cliente)
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(8);

  const [prevFiltros, setPrevFiltros] = useState({ buscarDebounced, fecha, estadoFilter, tipoFilter, limit });

  // El servidor aplica buscar/fecha/estado; el filtro Tipo de Cliente es client-side
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getCotizaciones({
          buscar: buscarDebounced,
          fecha,
          estado: estadoFilter,
          limit: 1000,
        });

        setCotizaciones(res.data);
      } catch (error) {
        console.error('Error fetching cotizaciones:', error);
        showToast.error('No se pudieron cargar las cotizaciones');
        setCotizaciones([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [buscarDebounced, fecha, estadoFilter]);

  // Debounce del buscador: lo aplica useDebounce (300ms)

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
      {/* Barra de Filtros (contenedor base FilterCard — sin bordes amarillos) */}
      <FilterCard>
        <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-end gap-x-6 gap-y-4">
          {/* BUSCAR */}
          <div className="flex-1 min-w-[220px]">
            <Input
              label="Buscar"
              type="text"
              icon={<Search className="w-4 h-4" />}
              value={buscar}
              onChange={(e) => {
                setBuscar(e.target.value);
              }}
              placeholder="Buscar"
            />
          </div>

          {/* FECHA */}
          <div className="w-full md:w-40">
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
          <div className="w-full md:w-40">
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
          <div className="w-full md:w-40">
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
        </div>
      </FilterCard>

      {/* Tabla */}
      <CotizacionesTable
        data={pageData}
        loading={loading}
        onEdit={(id) => router.push(`/cotizaciones/editar/${id}`)}
        onView={(id) => router.push(`/cotizaciones/pdf/${id}`)}
      />

      {/* Paginación */}
      {!loading && totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          onPageChange={setCurrentPage}
          onLimitChange={setLimit}
          itemLabel="cotizaciones"
        />
      )}

    </div>
  );
}