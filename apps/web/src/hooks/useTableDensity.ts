'use client';

import React, { createContext, useContext, useEffect, useSyncExternalStore, ReactNode } from 'react';

type Density = 'normal' | 'compact';

interface TableDensityContextValue {
  density: Density;
  setDensity: (density: Density) => void;
  toggleDensity: () => void;
}

const TableDensityContext = createContext<TableDensityContextValue | null>(null);
const listeners = new Set<() => void>();
let fallbackDensity: Density = 'normal';
function readDensity(): Density {
  try { return localStorage.getItem('table-density') === 'compact' ? 'compact' : 'normal'; }
  catch { return fallbackDensity; }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => { listeners.delete(listener); window.removeEventListener('storage', listener); };
}
function setDensity(density: Density) {
  fallbackDensity = density;
  try { localStorage.setItem('table-density', density); } catch { /* Session-only preference. */ }
  listeners.forEach(listener => listener());
}

interface TableDensityProviderProps {
  children: ReactNode;
}

export function TableDensityProvider({ children }: TableDensityProviderProps) {
  const density = useSyncExternalStore(subscribe, readDensity, (): Density => 'normal');

  useEffect(() => {
    const previous = document.documentElement.getAttribute('data-table-density');
    document.documentElement.setAttribute('data-table-density', density);
    return () => {
      if (previous === null) document.documentElement.removeAttribute('data-table-density');
      else document.documentElement.setAttribute('data-table-density', previous);
    };
  }, [density]);

  const toggleDensity = () => setDensity(density === 'normal' ? 'compact' : 'normal');

  const value = { density, setDensity, toggleDensity };

  // Use React.createElement to avoid Turbopack JSX parsing issues with Context.Provider
  return React.createElement(
    TableDensityContext.Provider,
    { value },
    children
  );
}

export function useTableDensity() {
  const context = useContext(TableDensityContext);
  if (!context) {
    throw new Error('useTableDensity must be used within a TableDensityProvider');
  }
  return context;
}
