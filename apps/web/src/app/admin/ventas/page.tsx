'use client';

import { Plus, Search, Filter, CreditCard, Calendar, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Venta {
  id_venta: number;
  numero_completo: string;
  tipo_documento: string;
  estado: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  total: string;
  monto_pagado: string;
  monto_pendiente: string;
  tipo_pago: string;
  cliente: { nombre: string } | null;
  usuario: { nombre: string } | null;
  almacen: { nombre: string } | null;
}

interface VentasResponse {
  data: Venta[];
  total: number;
}

type EstadoVenta = 'borrador' | 'emitida' | 'pagada' | 'parcial' | 'anulada' | 'devuelta';

const ESTADO_LABELS: Record<EstadoVenta, string> = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  pagada: 'Pagada',
  parcial: 'Parcial',
  anulada: 'Anulada',
  devuelta: 'Devuelta',
};

const ESTADO_COLORS: Record<EstadoVenta, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  emitida: 'bg-blue-100 text-blue-700',
  pagada: 'bg-green-100 text-green-700',
  parcial: 'bg-orange-100 text-orange-700',
  anulada: 'bg-red-100 text-red-700',
  devuelta: 'bg-purple-100 text-purple-700',
};

const DOCUMENTO_LABELS: Record<string, string> = {
  factura: 'Factura',
  boleta: 'Boleta',
  nota_venta: 'Nota Venta',
  nota_credito: 'Nota Crédito',
  nota_debito: 'Nota Débito',
  guia_remision: 'Guía Remisión',
};

export default function AdminVentasPage() {
  const { usuario } = useAuth();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [tipoPagoFilter, setTipoPagoFilter] = useState<string>('');

  const LIMIT = 20;

  useEffect(() => {
    const fetchVentas = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: LIMIT.toString(),
          offset: ((page - 1) * LIMIT).toString(),
        });
        if (search) params.append('search', search);
        if (estadoFilter) params.append('estado', estadoFilter);
        if (tipoPagoFilter) params.append('tipoPago', tipoPagoFilter);

        const response = await apiClient(`/ventas?${params.toString()}`);
        setVentas(response.data || []);
        setTotal(response.total || 0);
      } catch (error) {
        console.error('Error fetching ventas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVentas();
  }, [page, search, estadoFilter, tipoPagoFilter]);

  const totalPages = Math.ceil(total / LIMIT);

  const filteredVentas = ventas;

  const formatEstado = (estado: string): EstadoVenta => estado as EstadoVenta;

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <p className="text-gray-500">Gestión de ventas y documentos</p>
        </div>
        <Link
          href="/admin/ventas/crear"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white font-medium rounded-lg hover:bg-primary-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva Venta
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número, cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm w-full sm:w-40"
          >
            <option value="">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="emitida">Emitida</option>
            <option value="pagada">Pagada</option>
            <option value="parcial">Parcial</option>
            <option value="anulada">Anulada</option>
          </select>
          <select
            value={tipoPagoFilter}
            onChange={(e) => setTipoPagoFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm w-full sm:w-40"
          >
            <option value="">Tipo de pago</option>
            <option value="contado">Contado</option>
            <option value="credito">Crédito</option>
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
        ) : filteredVentas.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg">No se encontraron ventas</p>
            <p className="text-sm mt-1">Registre su primera venta</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Documento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vence</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Pendiente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendedor</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredVentas.map((venta) => (
                    <tr key={venta.id_venta} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            {DOCUMENTO_LABELS[venta.tipo_documento] || venta.tipo_documento}
                          </span>
                          <span className="font-mono text-sm font-medium text-gray-900">{venta.numero_completo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{venta.cliente?.nombre || 'Cliente general'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(venta.fecha_emision).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {venta.fecha_vencimiento
                          ? new Date(venta.fecha_vencimiento).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{venta.tipo_pago}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[formatEstado(venta.estado)] || 'bg-gray-100 text-gray-700'}`}>
                          {ESTADO_LABELS[formatEstado(venta.estado)] || venta.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        S/ {Number(venta.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-green-700">
                        S/ {Number(venta.monto_pagado).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-orange-700 font-medium">
                        S/ {Number(venta.monto_pendiente).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{venta.usuario?.nombre || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/ventas/${venta.id_venta}`}
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
                  Mostrando {((page - 1) * LIMIT) + 1} a {Math.min(page * LIMIT, total)} de {total} ventas
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