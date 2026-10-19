'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { showToast } from '@/lib/toast';
import { CotizacionesTable } from '@/features/cotizaciones/components/CotizacionesTable';
import { CotizacionItem } from '@/features/cotizaciones/types/cotizacion';
import { ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

export function CotizacionesView() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('');
  const [fecha, setFecha] = useState('');

  const fetchCotizaciones = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (buscar) params.set('buscar', buscar);
      if (estado) params.set('estado', estado);
      if (fecha) params.set('fecha', fecha);
      const res = await apiClient(`/cotizaciones?${params.toString()}`);
      setCotizaciones(res.data || []);
      setTotalPages(res.meta?.lastPage ?? 1);
      setTotal(res.meta?.total ?? 0);
    } catch (e) {
      console.error('Error cargando cotizaciones:', e);
      showToast.error('No se pudieron cargar las cotizaciones');
    } finally {
      setLoading(false);
    }
  }, [page, buscar, estado, fecha]);

  useEffect(() => {
    fetchCotizaciones();
  }, [fetchCotizaciones]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCotizaciones();
  };

  const handleFilterChange = (key: string, value: string) => {
    setPage(1);
    if (key === 'estado') setEstado(value);
    else if (key === 'fecha') setFecha(value);
  };

  const ESTADOS = [
    { value: '', label: 'Todos los estados' },
    { value: 'borrador', label: 'Borrador' },
    { value: 'enviada', label: 'Enviada' },
    { value: 'aprobada', label: 'Aprobada' },
    { value: 'rechazada', label: 'Rechazada' },
    { value: 'parcialmente_pagada', label: 'Parcial' },
    { value: 'expirada', label: 'Expirada' },
    { value: 'convertida_a_venta', label: 'Convertida' },
  ];

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar número, cliente, RUC..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), fetchCotizaciones())}
            className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" aria-hidden="true" />
            <select
              value={estado}
              onChange={(e) => handleFilterChange('estado', e.target.value)}
              className="pl-10 pr-8 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent appearance-none"
            >
              {ESTADOS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <input
              type="date"
              value={fecha}
              onChange={(e) => handleFilterChange('fecha', e.target.value)}
              className="pl-4 pr-4 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>

          <Button type="submit" className="px-4 py-2 whitespace-nowrap">
            Buscar
          </Button>
        </div>
      </form>

      <CotizacionesTable data={cotizaciones} loading={loading} />

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-zinc-200">
          <div className="text-sm text-zinc-600">
            Mostrando {cotizaciones.length} de {total} cotizaciones · Página {page} de {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
            <span className="text-sm text-zinc-600 w-20 text-center">{page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}