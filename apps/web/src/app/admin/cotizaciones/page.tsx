'use client';

import { Plus, Search, Filter, FileText, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Cotizacion {
  id_cotizacion: number;
  numero: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  estado: string;
  total: string;
  cliente: { nombre: string } | null;
  usuario: { nombre: string } | null;
}

interface CotizacionesResponse {
  data: Cotizacion[];
  total: number;
}

type EstadoCotizacion = 'borrador' | 'enviada' | 'aprobada' | 'rechazada';

const ESTADO_LABELS: Record<EstadoCotizacion, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

const ESTADO_COLORS: Record<EstadoCotizacion, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviada: 'bg-blue-100 text-blue-700',
  aprobada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
};

export default function AdminCotizacionesPage() {
  const { usuario } = useAuth();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');

  const LIMIT = 20;

  useEffect(() => {
    const fetchCotizaciones = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: LIMIT.toString(),
          offset: ((page - 1) * LIMIT).toString(),
        });
        if (search) params.append('search', search);
        if (estadoFilter) params.append('estado', estadoFilter);

        const response = await apiClient(`/cotizaciones?${params.toString()}`);
        setCotizaciones(response.data || []);
        setTotal(response.total || 0);
      } catch (error) {
        console.error('Error fetching cotizaciones:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCotizaciones();
  }, [page, search, estadoFilter]);

  const totalPages = Math.ceil(total / LIMIT);

  const filteredCotizaciones = cotizaciones;

  const formatEstado = (estado: string): EstadoCotizacion => estado as EstadoCotizacion;

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-gray-500">Gestión y seguimiento de cotizaciones</p>
        </div>
        <Link
          href="/admin/cotizaciones/crear"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white font-medium rounded-lg hover:bg-primary-800 transition-colors"
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
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm w-full sm:w-48"
          >
            <option value="">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="enviada">Enviada</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
          </select>
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
        ) : filteredCotizaciones.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg">No se encontraron cotizaciones</p>
            <p className="text-sm mt-1">Crea tu primera cotización para comenzar</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vence</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendedor</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCotizaciones.map((cot) => (
                    <tr key={cot.id_cotizacion} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{cot.numero}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{cot.cliente?.nombre || 'Cliente general'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(cot.fecha_emision).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {cot.fecha_vencimiento
                          ? new Date(cot.fecha_vencimiento).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[formatEstado(cot.estado)] || 'bg-gray-100 text-gray-700'}`}>
                          {ESTADO_LABELS[formatEstado(cot.estado)] || cot.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        S/ {Number(cot.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{cot.usuario?.nombre || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/cotizaciones/${cot.id_cotizacion}`}
                          className="text-sm text-primary-700 hover:text-primary-900 font-medium"
                        >
                          Ver
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
                  Mostrando {((page - 1) * LIMIT) + 1} a {Math.min(page * LIMIT, total)} de {total} cotizaciones
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700">Página {page} de {totalPages}</span>
                  <button
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