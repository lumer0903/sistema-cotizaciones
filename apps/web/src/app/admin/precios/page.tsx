'use client';

import { Plus, Search, Filter, Tag, History, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PrecioActual {
  id_producto: number;
  codigo: string;
  descripcion: string;
  costo_normal: string;
  precio_unidad_normal: string;
  precio_docena_normal: string;
  precio_mayor_normal: string;
  costo_distribuidor: string;
  precio_unidad_dist: string;
  precio_docena_dist: string;
  precio_mayor_dist: string;
  updated_at: string;
}

interface HistorialPrecio {
  id_historial: number;
  id_producto: number;
  campo_modificado: string;
  valor_anterior: string;
  valor_nuevo: string;
  fecha_cambio: string;
  producto: { descripcion: string };
  usuario: { nombre: string } | null;
}

type ActiveTab = 'actuales' | 'historial';

export default function AdminPreciosPage() {
  const { usuario } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('actuales');
  const [precios, setPrecios] = useState<PrecioActual[]>([]);
  const [historial, setHistorial] = useState<HistorialPrecio[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'actuales') {
          const response = await apiClient('/productos?include=precios&limit=100');
          setPrecios(
            (response.data || [])
              .filter((p: any) => p.precios_actuales)
              .map((p: any) => ({ ...p.precios_actuales, codigo: p.codigo, descripcion: p.descripcion }))
          );
          setTotal(response.total || 0);
        } else {
          const response = await apiClient('/historial-precios?limit=100');
          setHistorial(response.data || []);
          setTotal(response.total || 0);
        }
      } catch (error) {
        console.error('Error fetching precios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const filteredPrecios = precios.filter(
    (p) =>
      p.codigo.toLowerCase().includes(search.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistorial = historial.filter(
    (h) =>
      h.producto?.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      h.campo_modificado.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Precios e Historial</h1>
          <p className="text-gray-500">Gestión de listas de precios y auditoría de cambios</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'actuales' && (
            <Link
              href="/admin/precios/importar"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white font-medium rounded-lg hover:bg-primary-800 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Importar Precios
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('actuales')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'actuales'
                  ? 'border-primary-700 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Tag className="h-4 w-4 inline mr-1.5" />
              Precios Actuales
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'historial'
                  ? 'border-primary-700 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History className="h-4 w-4 inline mr-1.5" />
              Historial de Cambios
            </button>
          </nav>
        </div>

        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'actuales' ? 'Buscar producto...' : 'Buscar en historial...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
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
        ) : activeTab === 'actuales' ? (
          <div className="overflow-x-auto">
            {filteredPrecios.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Tag className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-lg">No se encontraron precios</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Normal</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Docena</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Mayor</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Distribuidor</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Docena Dist</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Mayor Dist</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPrecios.map((p) => (
                    <tr key={p.id_producto} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.descripcion}</p>
                        <p className="text-sm text-gray-500 font-mono">{p.codigo}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">S/ {Number(p.precio_unidad_normal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">S/ {Number(p.precio_docena_normal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">S/ {Number(p.precio_mayor_normal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">S/ {Number(p.precio_unidad_dist).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">S/ {Number(p.precio_docena_dist).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">S/ {Number(p.precio_mayor_dist).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(p.updated_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {filteredHistorial.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <History className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-lg">No hay cambios registrados</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Anterior</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Nuevo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredHistorial.map((h) => (
                    <tr key={h.id_historial} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{h.producto?.descripcion || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{h.campo_modificado.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        S/ {Number(h.valor_anterior).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-primary-700 font-medium">
                        S/ {Number(h.valor_nuevo).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{h.usuario?.nombre || 'Sistema'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(h.fecha_cambio).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}