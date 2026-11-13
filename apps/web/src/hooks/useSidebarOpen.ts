'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'sidebarExpanded';

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

/** Preferencia guardada; sin dato, expandido en desktop (true). */
const getSnapshot = (): boolean => {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === 'true';
  // Soporte legacy de sidebarOpen si existía
  const legacy = window.localStorage.getItem('sidebarOpen');
  if (legacy !== null) return legacy === 'true';
  return true;
};

/** SSR: true en servidor para evitar saltos. */
const getServerSnapshot = (): boolean => true;

/**
 * Estado expandido/colapsado del sidebar en escritorio (persistido en localStorage).
 */
export function useSidebarOpen(): [boolean, (open: boolean) => void] {
  const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setOpen = useCallback((next: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, String(next));
    notify();
  }, []);

  return [open, setOpen];
}
