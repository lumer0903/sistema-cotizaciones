'use client';

import { FileText, Plus, Search, Filter, ChevronDown, Calendar, Eye, Edit, Trash2, Send, Download } from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import { EstadoCotizacion } from '@goldcontinent/shared/constants/enums';
import Link from 'next/link';

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
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

const ESTADO_COLORS: Record<EstadoCotizacion, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviada: 'bg-blue-100 text-blue-700',
  aprobada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
};

export default function CotizacionesPage() {
  const { usuario } = useAuth();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoCotizacion | 'todos'>('todos');

  useEffect(() => {
    const fetchCotizaciones = async () => {
      try {
        let url = '/cotizaciones?limit=100';
        if (estadoFilter !== 'todos') {
          url += `&estado=${estadoFilter}`;
        }
        const data = await apiClient(url);
        if (data.success) {
          setCotizaciones(data.data);
        }
      } catch (error) {
        console.error('Error fetching cotizaciones:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCotizaciones();
  }, [estadoFilter]);

  const filteredCotizaciones = cotizaciones.filter(c =>
    c.numero.toLowerCase().includes(search.toLowerCase()) ||
    c.cliente_nombre?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Cotizaciones</h1>
          <p className="text-gray-500">Gestiona tus cotizaciones comerciales</p>
        </div>
        <Link
          href="/vendedor/cotizaciones/crear"
          className="px-4 py-2 bg-green-700 text-white rounded-xl hover:bg-green-800 transition-colors flex items-center gap-2"
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value as EstadoCotizacion | 'todos')}
              className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm appearance-none"
            >
              <option value="todos">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="enviada">Enviada</option>
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
          <div className="divide-y divide-gray-200">
            {filteredCotizaciones.map((cot) => (
              <div key={cot.id_cotizacion} className="p-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-semibold text-gray-900">{cot.numero}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[cot.estado]}`}>
                      {ESTADO_LABELS[cot.estado]}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(cot.created_at).toLocaleDateString('es-PE')}
                    </span>
                  </div>
                  <p className="text-gray-900 font-medium mt-1 truncate sm:max-w-md">{cot.cliente_nombre || 'Cliente no especificado'}</p>
                  <p className="text-lg font-bold text-green-700 mt-1">S/ ${cot.total.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/vendedor/cotizaciones/${cot.id_cotizacion}`}
                    className="p-2 text-gray-500 hover:text-green-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Ver detalle"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  {cot.estado === 'borrador' && (
                    <>
                      <Link
                        href={`/vendedor/cotizaciones/${cot.id_cotizacion}/editar`}
                        className="p-2 text-gray-500 hover:text-green-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        className="p-2 text-gray-500 hover:text-red-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {cot.estado === 'enviada' && (
                    <button className="p-2 text-gray-500 hover:text-blue-700 hover:bg-gray-100 rounded-lg transition-colors" title="Reenviar">
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                  <button className="p-2 text-gray-500 hover:text-green-700 hover:bg-gray-100 rounded-lg transition-colors" title="Descargar PDF">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}