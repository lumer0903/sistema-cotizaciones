'use client';

import React from 'react';
import { Input } from '@/components/ui';

export interface Cliente {
  id_cliente: number;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  ruc_dni?: string | null;
}

interface ClienteAutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  onSelectCliente: (c: Cliente | null) => void;
  variant?: 'default' | 'modal'; // <-- Soporte para variant
}

export function ClienteAutocomplete({
  value,
  onChange,
  onSelectCliente,
  variant = 'default',
}: ClienteAutocompleteProps) {
  return (
    <div className="relative">
      <Input
        label="Nombre del cliente"
        variant={variant}
        placeholder="Nombre o razón social"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!e.target.value) {
            onSelectCliente(null);
          }
        }}
      />
      {/* Tu lógica existente del menú desplegable o sugerencias aquí */}
    </div>
  );
}