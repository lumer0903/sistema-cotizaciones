'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'sidebarOpen';

/** Oyentes de la misma pestaña (el evento `storage` llega de otras pestañas). */
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

const subscribe = (onStoreChange: () => void) => {
  listeners.add(onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
};

/** Preferencia guardada; sin dato, abierto en desktop (>= 1024px). */
const getSnapshot = (): boolean => {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === 'true';
  return window.innerWidth >= 1024;
};

/** SSR: siempre cerrado; React aplica el snapshot real tras la hidratación. */
const getServerSnapshot = (): boolean => false;

/**
 * Estado del sidebar persistido en localStorage.
 * `useSyncExternalStore` en lugar de `useState` + `useEffect`: React resuelve
 * la hidratación SSR/cliente sin setState dentro de efectos y mantiene
 * sincronizadas las pestañas.
 */
export function useSidebarOpen(): [boolean, (open: boolean) => void] {
  const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setOpen = useCallback((next: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, String(next));
    notify();
  }, []);

  return [open, setOpen];
}
