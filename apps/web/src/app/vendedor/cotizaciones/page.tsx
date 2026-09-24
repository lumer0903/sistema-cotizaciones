'use client';

import { FileText, Plus, Search, Filter, ChevronDown, Eye, Edit, Trash2, Send, Download } from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState, useMemo } from 'react';
import { EstadoCotizacion } from '@goldcontinent/shared/constants/enums';
import Link from 'next/link';
import { Badge, ESTADO_BADGE } from '@/components/ui';

interface Cotizacion {
  id_cotizacion: number;
  numero: string;
  cliente_nombre: string;
  total: number;
  estado: EstadoCotizacion;
  created_at: string;
  tiempo_inicio: string;
}

const ESTADO_LABELS: Record<EstadoCotizacion, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  parcialmente_pagada: 'Parcialmente Pagada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

export default function CotizacionesPage() {
  const { usuario } = useAuth();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fecha, setFecha] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoCotizacion | 'todos'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Obtener dataset filtrado (sin paginado de servidor, con filtros al API)
  useEffect(() => {
    const fetchCotizaciones = async () => {
      try {
        setLoading(true);
        let url = '/cotizaciones?limit=1000';
        if (search.trim()) {
          url += `&buscar=${encodeURIComponent(search.trim())}`;
        }
        if (fecha) {
          url += `&fecha=${fecha}`;
        }
        if (estadoFilter !== 'todos') {
          url += `&estado=${estadoFilter}`;
        }
        const data = await apiClient(url);
        if (data.success) {
          setCotizaciones(data.data);
        }
      } catch (error) {
        console.error('Error fetching cotizaciones:', error);
        // Fallback: intentar sin parámetros
        try {
          const fallbackData = await apiClient('/cotizaciones');
          if (fallbackData.success) {
            setCotizaciones(fallbackData.data);
          }
        } catch (fallbackError) {
          console.error('Fallback también falló:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCotizaciones();
  }, [search, fecha, estadoFilter]);

  // Filtrado reactivo en cliente como fallback
  const filteredCotizaciones = useMemo(() => {
    return cotizaciones.filter((c) => {
      const matchBuscar =
        !search.trim() ||
        c.numero.toUpperCase().includes(search.toUpperCase()) ||
        c.cliente_nombre?.toUpperCase().includes(search.toUpperCase());

      const matchFecha = !fecha || c.created_at.includes(fecha);

      const matchEstado =
        estadoFilter === 'todos' || c.estado === estadoFilter;

      return matchBuscar && matchFecha && matchEstado;
    });
  }, [cotizaciones, search, fecha, estadoFilter]);

  // Paginación local
  const totalPages = Math.ceil(filteredCotizaciones.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCotizaciones.slice(start, start + itemsPerPage);
  }, [filteredCotizaciones, currentPage, itemsPerPage]);

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Cotizaciones</h1>
          <p className="text-gray-500">Gestiona tus cotizaciones comerciales</p>
        </div>
        <Link
          href="/vendedor/cotizaciones/crear"
          className="px-4 py-2 bg-brand-primary text-white rounded-xl hover:bg-brand-hover transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva Cotización
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número o cliente..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value.toUpperCase());
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">FECHA</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={estadoFilter}
              onChange={(e) => {
                setEstadoFilter(e.target.value as EstadoCotizacion | 'todos');
                setCurrentPage(1);
              }}
              className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm appearance-none"
            >
              <option value="todos">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="enviada">Enviada</option>
              <option value="parcialmente_pagada">Parcialmente Pagada</option>
              <option value="aprobada">Aprobada</option>
              <option value="rechazada">Rechazada</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-200">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredCotizaciones.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No se encontraron cotizaciones</p>
            <p className="text-sm">Intenta cambiar los filtros o crea una nueva</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {paginatedData.map((cot) => (
                <div key={cot.id_cotizacion} className="p-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-gray-900">{cot.numero}</span>
                      <Badge variant={ESTADO_BADGE[cot.estado] || 'borrador'}>
                        {ESTADO_LABELS[cot.estado]}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(cot.created_at).toLocaleDateString('es-PE')}
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium mt-1 truncate sm:max-w-md">{cot.cliente_nombre || 'Cliente no especificado'}</p>
                    <p className="text-lg font-bold text-brand-primary mt-1">S/ ${cot.total.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/vendedor/cotizaciones/${cot.id_cotizacion}`}
                      className="p-2 text-gray-500 hover:text-brand-primary hover:bg-gray-100 rounded-lg transition-colors"
                      title="Ver detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    {cot.estado === 'borrador' && (
                      <>
                        <Link
                          href={`/vendedor/cotizaciones/${cot.id_cotizacion}/editar`}
                          className="p-2 text-gray-500 hover:text-brand-primary hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          className="p-2 text-gray-500 hover:text-danger hover:bg-gray-100 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {cot.estado === 'enviada' && (
                      <button className="p-2 text-gray-500 hover:text-tienda hover:bg-gray-100 rounded-lg transition-colors" title="Reenviar">
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                    <button className="p-2 text-gray-500 hover:text-brand-primary hover:bg-gray-100 rounded-lg transition-colors" title="Descargar PDF">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-500">
                  Mostrando <span className="font-medium">{paginatedData.length}</span> de{' '}
                  <span className="font-medium">{filteredCotizaciones.length}</span> cotizaciones
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg font-medium text-sm transition-colors ${currentPage === page
                          ? 'bg-brand-primary text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                  {currentPage < totalPages && (
                    <>
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronDown className="w-4 h-4" style={{ transform: 'rotate(-90deg)' }} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}