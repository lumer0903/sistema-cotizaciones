'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui';
import { buscarClientes, ClienteApi } from '../api/cotizacionApi';

interface ClienteAutocompleteProps {
  value: string;
  onChange: (nombre: string) => void;
  onSelectCliente: (cliente: ClienteApi | null) => void;
}

export function ClienteAutocomplete({ value, onChange, onSelectCliente }: ClienteAutocompleteProps) {
  const [resultados, setResultados] = useState<ClienteApi[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleChange = (nombre: string) => {
    onChange(nombre);
    // Si el usuario edita manualmente, se pierde la vinculación hasta reseleccionar
    // (el padre decide si marca clienteEditado)
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = nombre.trim();
    if (q.length < 2) {
      setResultados([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await buscarClientes(q, 5);
        setResultados(list);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  return (
    <div ref={boxRef} className="relative">
      <Input
        label="Nombre"
        placeholder="Nombre del cliente"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (resultados.length > 0) setOpen(true);
        }}
      />
      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-zinc-100">
          {loading ? (
            <div className="p-3 text-xs text-zinc-400 text-center">Buscando...</div>
          ) : resultados.length > 0 ? (
            resultados.map((c) => (
              <button
                key={c.id_cliente}
                type="button"
                onClick={() => {
                  onSelectCliente(c);
                  setOpen(false);
                }}
                className="w-full text-left p-3 hover:bg-brand-soft/60 transition-colors"
              >
                <p className="text-xs font-bold text-zinc-700">{c.nombre}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {[c.ruc_dni, c.telefono, c.email].filter(Boolean).join(' · ') || 'Sin datos'}
                </p>
              </button>
            ))
          ) : (
            <div className="p-3 text-xs text-zinc-400 text-center">
              Sin coincidencias — se creará como nuevo cliente
            </div>
          )}
        </div>
      )}
    </div>
  );
}
