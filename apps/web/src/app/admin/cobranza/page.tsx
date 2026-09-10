'use client';

import { Search, Filter, DollarSign, AlertTriangle, Clock, CreditCard, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CuentaCobrar {
  id_cuenta: number;
  id_venta: number;
  venta: {
    numero_completo: string;
    fecha_emision: string;
    fecha_vencimiento: string | null;
    tipo_pago: string;
    cliente: { nombre: string; ruc_dni: string | null } | null;
  };
  monto_original: string;
  monto_pendiente: string;
  estado: string;
  fecha_vencimiento: string;
  dias_atraso: number;
  mora_acumulada: string;
}

interface CobranzaResponse {
  data: CuentaCobrar[];
  total: number;
}

type EstadoCuenta = 'pendiente' | 'parcial' | 'pagada' | 'vencida' | 'castigada';

const ESTADO_LABELS: Record<EstadoCuenta, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagada: 'Pagada',
  vencida: 'Vencida',
  castigada: 'Castigada',
};

const ESTADO_COLORS: Record<EstadoCuenta, string> = {
  pendiente: 'bg-blue-100 text-blue-700',
  parcial: 'bg-orange-100 text-orange-700',
  pagada: 'bg-green-100 text-green-700',
  vencida: 'bg-red-100 text-red-700',
  castigada: 'bg-gray-100 text-gray-700',
};

export default function AdminCobranzaPage() {
  const { usuario } = useAuth();
  const [cuentas, setCuentas] = useState<CuentaCobrar[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');

  const LIMIT = 20;

  useEffect(() => {
    const fetchCuentas = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: LIMIT.toString(),
          offset: ((page - 1) * LIMIT).toString(),
        });
        if (search) params.append('search', search);
        if (estadoFilter) params.append('estado', estadoFilter);

        const response = await apiClient(`/cobranza?${params.toString()}`);
        setCuentas(response.data || []);
        setTotal(response.total || 0);
      } catch (error) {
        console.error('Error fetching cobranza:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCuentas();
  }, [page, search, estadoFilter]);

  const totalPages = Math.ceil(total / LIMIT);

  // Resumen
  const totalPendiente = cuentas.reduce((sum, c) => sum + Number(c.monto_pendiente), 0);
  const totalMora = cuentas.reduce((sum, c) => sum + Number(c.mora_acumulada), 0);
  const cuentasVencidas = cuentas.filter((c) => c.dias_atraso > 0).length;
  const cuentasPorVencer = cuentas.filter((c) => c.dias_atraso === 0 && c.estado !== 'pagada' && c.estado !== 'castigada').length;

  const formatEstado = (estado: string): EstadoCuenta => estado as EstadoCuenta;

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cobranza</h1>
          <p className="text-gray-500">Gestión de cuentas por cobrar y seguimiento de pagos</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Por Cobrar</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">S/ {totalPendiente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-100">
              <DollarSign className="h-6 w-6 text-blue-700" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Mora Acumulada</p>
              <p className="text-2xl font-bold text-red-600 mt-1">S/ {totalMora.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-700" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Vencidas</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{cuentasVencidas}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-100">
              <Clock className="h-6 w-6 text-red-700" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Por Vencer</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{cuentasPorVencer}</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-100">
              <AlertTriangle className="h-6 w-6 text-orange-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, documento..."
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
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="vencida">Vencida</option>
            <option value="castigada">Castigada</option>
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
        ) : cuentas.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg">No se encontraron cuentas por cobrar</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Documento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha Emisión</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha Vence</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Original</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Pendiente</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Mora</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Días Atraso</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cuentas.map((cuenta) => (
                    <tr key={cuenta.id_cuenta} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-gray-900">{cuenta.venta.numero_completo}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {cuenta.venta.cliente?.nombre || 'Cliente general'}
                        {cuenta.venta.cliente?.ruc_dni && (
                          <p className="text-xs text-gray-400">{cuenta.venta.cliente.ruc_dni}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(cuenta.venta.fecha_emision).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(cuenta.fecha_vencimiento).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[formatEstado(cuenta.estado)] || 'bg-gray-100 text-gray-700'}`}>
                          {ESTADO_LABELS[formatEstado(cuenta.estado)] || cuenta.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        S/ {Number(cuenta.monto_original).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-green-700">
                        S/ {Number(cuenta.monto_original).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-orange-700">
                        S/ {Number(cuenta.monto_pendiente).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-red-600">
                        S/ {Number(cuenta.mora_acumulada).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        {cuenta.dias_atraso > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <Clock className="h-3 w-3 mr-1" />
                            {cuenta.dias_atraso} días
                          </span>
                        ) : (
                          <span className="text-sm text-green-700">Al día</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/cobranza/${cuenta.id_cuenta}`}
                          className="text-sm text-primary-700 hover:text-primary-900 font-medium"
                        >
                          Gestionar
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
                  Mostrando {((page - 1) * LIMIT) + 1} a {Math.min(page * LIMIT, total)} de {total} cuentas
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