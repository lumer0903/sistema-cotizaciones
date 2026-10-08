'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { showToast } from '@/lib/toast';
import { CotizacionesTable } from '@/features/cotizaciones/components/CotizacionesTable';
import { CotizacionItem } from '@/features/cotizaciones/types/cotizacion';

export function CotizacionesView() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCotizaciones = async () => {
      try {
        const res = await apiClient('/cotizaciones');
        setCotizaciones(res.data || []);
      } catch (e) {
        console.error('Error cargando cotizaciones:', e);
        showToast.error('No se pudieron cargar las cotizaciones');
      } finally {
        setLoading(false);
      }
    };
    void fetchCotizaciones();
  }, []);

  return <CotizacionesTable data={cotizaciones} loading={loading} />;
}
