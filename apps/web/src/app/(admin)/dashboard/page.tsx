'use client';

import { Package, Users, FileText, DollarSign, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/authProvider';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalProductos: number;
  totalCotizaciones: number;
  totalVentas: number;
  montoPendiente: number;
  productosBajoStock: number;
  cotizacionesEsteMes: number;
}

export default function AdminDashboardPage() {
  const { usuario } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [productos, cotizaciones, ventas, cuentasCobrar] = await Promise.all([
          apiClient('/productos?limit=1'),
          apiClient('/cotizaciones?limit=1'),
          apiClient('/ventas?limit=1'),
          apiClient('/ventas?tipoPago=credito&estado=pendiente&limit=100'),
        ]);

        setStats({
          totalProductos: productos.total || 0,
          totalCotizaciones: cotizaciones.total || 0,
          totalVentas: ventas.total || 0,
          montoPendiente: cuentasCobrar.data?.reduce((sum: number, c: any) => sum + (c.montoPendiente || 0), 0) || 0,
          productosBajoStock: 0,
          cotizacionesEsteMes: 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Productos', value: stats?.totalProductos || 0, icon: Package, color: 'bg-blue-500', href: '/admin/productos' },
    { label: 'Cotizaciones', value: stats?.totalCotizaciones || 0, icon: FileText, color: 'bg-green-500', href: '/admin/cotizaciones' },
    { label: 'Ventas', value: stats?.totalVentas || 0, icon: DollarSign, color: 'bg-purple-500', href: '/admin/ventas' },
    { label: 'Por Cobrar', value: stats?.montoPendiente ? `S/ ${stats.montoPendiente.toLocaleString()}` : 'S/ 0', icon: TrendingUp, color: 'bg-orange-500', href: '/admin/cobranza' },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Bienvenido, {usuario?.nombre}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-8 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {statCards.map((stat) => (
              <Link key={stat.label} href={stat.href} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Accesos rápidos</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/admin/productos" className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Package className="h-8 w-8 text-primary-700 mb-2" />
                <p className="font-medium text-gray-900">Gestionar Productos</p>
                <p className="text-sm text-gray-500 mt-1">Inventario, precios, importación</p>
              </Link>
              <Link href="/admin/cotizaciones/crear" className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <FileText className="h-8 w-8 text-green-700 mb-2" />
                <p className="font-medium text-gray-900">Nueva Cotización</p>
                <p className="text-sm text-gray-500 mt-1">Crear cotización para cliente</p>
              </Link>
              <Link href="/admin/ventas/crear" className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <DollarSign className="h-8 w-8 text-purple-700 mb-2" />
                <p className="font-medium text-gray-900">Nueva Venta</p>
                <p className="text-sm text-gray-500 mt-1">Registrar venta contado o crédito</p>
              </Link>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}