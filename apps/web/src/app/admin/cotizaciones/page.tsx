'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { getCotizaciones } from '@/features/cotizaciones/api/cotizacionApi';
import { CotizacionItem, EstadoCotizacion } from '@/features/cotizaciones/types/cotizacion';
import { CotizacionesTable } from '@/features/cotizaciones/components/CotizacionesTable';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';

const ESTADO_OPTIONS = [
  { label: 'Seleccionar', value: 'TODOS' },
  { label: 'BORRADOR', value: 'BORRADOR' },
  { label: 'ENVIADO', value: 'ENVIADO' },
  { label: 'PARCIALMENTE PAGADA', value: 'PARCIALMENTE_PAGADA' },
  { label: 'APROBADO', value: 'APROBADO' },
  { label: 'RECHAZADO', value: 'RECHAZADO' },
];

export default function MisCotizacionesPage() {
  const router = useRouter();

  // Estados de Filtros
  const [buscar, setBuscar] = useState('');
  const [fecha, setFecha] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoCotizacion | 'TODOS'>('TODOS');

  // Estados de Datos
  const [cotizaciones, setCotizaciones] = useState<CotizacionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(8);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCotizaciones({
        buscar,
        fecha,
        estado: estadoFilter,
        page: currentPage,
        limit,
      });

      setCotizaciones(res.data);
      setTotalItems(res.total);
    } catch (error) {
      console.error('Error fetching cotizaciones:', error);
      showToast.error('No se pudieron cargar las cotizaciones');
      setCotizaciones([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [buscar, fecha, estadoFilter, currentPage, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [buscar, fecha, estadoFilter, limit]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <div className="min-h-screen bg-stone-50 max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-3 font-['DM_Sans']">
      {/* Barra de Filtros */}
      <div className="w-full bg-white rounded-2xl shadow-sm border-l-4 border-brand-primary p-4 mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
        {/* BUSCAR */}
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-xs font-black tracking-wider text-brand-primary uppercase">
            BUSCAR
          </label>
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-brand-primary absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={buscar}
              onChange={(e) => {
                setBuscar(e.target.value);
              }}
              placeholder="Buscar por código o cliente"
              className="w-full h-10 pl-11 pr-4 rounded-xl border border-brand-primary focus:border-brand-hover focus:ring-2 focus:ring-brand-soft outline-none text-brand-subtitle text-sm placeholder:text-brand-options transition-all"
            />
          </div>
        </div>

        {/* FECHA */}
        <div className="w-full md:w-56 flex flex-col gap-1.5">
          <label className="text-xs font-black tracking-wider text-brand-primary uppercase">
            FECHA
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
            }}
            className="w-full h-10 px-3.5 rounded-xl border border-brand-primary focus:border-brand-hover focus:ring-2 focus:ring-brand-soft outline-none text-brand-subtitle text-sm bg-white cursor-pointer transition-all"
          />
        </div>

        {/* ESTADO */}
        <div className="w-full md:w-56 flex flex-col gap-1.5">
          <label className="text-xs font-black tracking-wider text-brand-primary uppercase">
            ESTADO
          </label>
          <Select
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(String(e.target.value) as EstadoCotizacion | 'TODOS');
            }}
            options={ESTADO_OPTIONS}
            className="w-full"
          />
        </div>
      </div>

      {/* Tabla */}
      <CotizacionesTable
        data={cotizaciones}
        loading={loading}
        onEdit={(id) => router.push(`/admin/cotizaciones/editar/${id}`)}
        onView={(id) => router.push(`/admin/cotizaciones/detalle/${id}`)}
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