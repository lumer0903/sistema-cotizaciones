'use client';

import { useEffect, useState } from 'react';

/**
 * Devuelve `value` después de que deja de cambiar durante `delay` ms.
 * Evita disparar una consulta HTTP por cada tecla en campos de filtro.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
