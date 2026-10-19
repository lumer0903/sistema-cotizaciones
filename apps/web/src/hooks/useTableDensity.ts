'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Density = 'normal' | 'compact';

interface TableDensityContextValue {
  density: Density;
  setDensity: (density: Density) => void;
  toggleDensity: () => void;
}

const TableDensityContext = createContext<TableDensityContextValue | null>(null);

interface TableDensityProviderProps {
  children: ReactNode;
}

export function TableDensityProvider({ children }: TableDensityProviderProps) {
  const [density, setDensity] = useState<Density>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('table-density') as Density) || 'normal';
    }
    return 'normal';
  });

  useEffect(() => {
    localStorage.setItem('table-density', density);
    document.documentElement.setAttribute('data-table-density', density);
  }, [density]);

  const toggleDensity = () => setDensity((d) => (d === 'normal' ? 'compact' : 'normal'));

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