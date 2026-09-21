'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ChevronDown, ChevronRight, ChevronsRight } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { getCotizaciones } from '@/features/cotizaciones/api/cotizacionApi';
import { CotizacionItem, EstadoCotizacion } from '@/features/cotizaciones/types/cotizacion';
import { CotizacionesTable } from '@/features/cotizaciones/components/CotizacionesTable';

export default function MisCotizacionesPage() {
  const router = useRouter();

  // Estados de Filtros
  const [buscar, setBuscar] = useState('');
  const [fecha, setFecha] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoCotizacion | 'TODOS'>('TODOS');

  // Estados de Datos
  const [rawCotizaciones, setRawCotizaciones] = useState<CotizacionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Paginación (20 registros por página)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCotizaciones({
        buscar,
        fecha,
        estado: estadoFilter,
        page: currentPage,
        limit: itemsPerPage,
      });

      const rawList = Array.isArray(res) ? res : res?.data || [];
      // Mapear respuesta de API (con id_cotizacion, cliente objeto, created_at) a formato UI
      const mappedList = rawList.map((item: any) => ({
        id: item.id_cotizacion,
        id_cotizacion: item.id_cotizacion,
        codigo: item.numero,
        cliente: typeof item.cliente === 'object' ? (item.cliente?.nombre || '-') : (item.cliente || '-'),
        fecha: item.created_at ? new Date(item.created_at).toLocaleDateString('es-PE') : (item.fecha || '-'),
        tipo: (item.tipo_precio === 'distribuidor' ? 'DISTRIBUIDOR' : 'TIENDA') as 'DISTRIBUIDOR' | 'TIENDA',
        estado: (item.estado?.toUpperCase() || 'BORRADOR') as EstadoCotizacion,
        total: Number(item.total),
      }));
      setRawCotizaciones(mappedList);
    } catch (error) {
      console.error('Error fetching cotizaciones:', error);
      toast.error('No se pudieron cargar las cotizaciones');
      setRawCotizaciones([]);
    } finally {
      setLoading(false);
    }
  }, [buscar, fecha, estadoFilter, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrado reactivo en cliente (resguardo si el backend ignora params)
  const filteredCotizaciones = useMemo(() => {
    return rawCotizaciones.filter((item) => {
      const matchBuscar =
        !buscar.trim() ||
        (item.codigo && item.codigo.toLowerCase().includes(buscar.toLowerCase())) ||
        (item.cliente && item.cliente.toLowerCase().includes(buscar.toLowerCase()));

      const matchFecha = !fecha || (item.fecha && item.fecha.includes(fecha));

      const matchEstado =
        estadoFilter === 'TODOS' ||
        (item.estado && item.estado.toUpperCase() === estadoFilter.toUpperCase());

      return matchBuscar && matchFecha && matchEstado;
    });
  }, [rawCotizaciones, buscar, fecha, estadoFilter]);

  // Paginado de 20 en 20
  const totalPages = Math.ceil(filteredCotizaciones.length / itemsPerPage) || 1;

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCotizaciones.slice(start, start + itemsPerPage);
  }, [filteredCotizaciones, currentPage, itemsPerPage]);

  return (
    /* 
      APLICADO: Se redujo el padding lateral y vertical en el contenedor principal 
      para que la vista respire mejor en pantallas más compactas.
    */
    <div className="min-h-screen bg-stone-50 max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-3 font-['DM_Sans']">

      {/* Barra de Filtros */}
      <div className="w-full bg-white rounded-2xl shadow-sm border-l-4 border-amber-400 p-6 mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
        {/* BUSCAR */}
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-xs font-black tracking-wider text-amber-400 uppercase">
            BUSCAR
          </label>
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-amber-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={buscar}
              onChange={(e) => {
                setBuscar(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por código o cliente"
              className="w-full h-10 pl-11 pr-4 rounded-xl border border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none text-neutral-700 text-sm placeholder:text-neutral-400 transition-all"
            />
          </div>
        </div>

        {/* FECHA */}
        <div className="w-full md:w-56 flex flex-col gap-1.5">
          <label className="text-xs font-black tracking-wider text-amber-400 uppercase">
            FECHA
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-10 px-3.5 rounded-xl border border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none text-neutral-700 text-sm bg-white cursor-pointer transition-all"
          />
        </div>

        {/* ESTADO */}
        <div className="w-full md:w-56 flex flex-col gap-1.5">
          <label className="text-xs font-black tracking-wider text-amber-400 uppercase">
            ESTADO
          </label>
          <div className="relative flex items-center">
            <select
              value={estadoFilter}
              onChange={(e) => {
                setEstadoFilter(e.target.value as EstadoCotizacion | 'TODOS');
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3.5 pr-9 rounded-xl border border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none text-neutral-700 text-sm appearance-none bg-white cursor-pointer transition-all"
            >
              <option value="TODOS">Seleccionar</option>
              <option value="BORRADOR">BORRADOR</option>
              <option value="ENVIADO">ENVIADO</option>
              <option value="ACEPTADO">ACEPTADO</option>
              <option value="RECHAZADO">RECHAZADO</option>
            </select>
            <ChevronDown className="w-5 h-5 text-amber-400 absolute right-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <CotizacionesTable
        data={paginatedData}
        loading={loading}
        onEdit={(id) => router.push(`/admin/cotizaciones/editar/${id}`)}
        onView={(id) => router.push(`/admin/cotizaciones/detalle/${id}`)}
      />

      {/* Paginación */}
      {!loading && filteredCotizaciones.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 px-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600 font-medium">Página</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg font-bold text-sm transition-colors ${currentPage === page
                    ? 'bg-amber-400 text-white shadow-sm'
                    : 'text-neutral-700 hover:bg-gray-200'
                    }`}
                >
                  {page}
                </button>
              ))}

              {currentPage < totalPages && (
                <>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className="w-8 h-8 flex items-center justify-center text-neutral-700 hover:bg-gray-200 rounded-lg"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-8 h-8 flex items-center justify-center text-neutral-700 hover:bg-gray-200 rounded-lg"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="text-sm text-neutral-600 font-medium">
            Mostrando <span className="font-bold">{paginatedData.length}</span> de{' '}
            <span className="font-bold">{filteredCotizaciones.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
