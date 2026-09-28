'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui';
import { buscarClientes, ClienteApi } from '@/features/cotizaciones/api/cotizacionApi';

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
}

const DEBOUNCE_MS = 300;
const MAX_RESULTADOS = 5;

export function ClienteAutocomplete({
  value,
  onChange,
  onSelectCliente,
}: ClienteAutocompleteProps) {
  const [abierta, setAbierta] = useState(false);
  const [resultados, setResultados] = useState<ClienteApi[]>([]);
  const [cargando, setCargando] = useState(() => value.trim() !== '');
  const [activo, setActivo] = useState(-1);
  const [prevValue, setPrevValue] = useState(value);
  const seqRef = useRef(0);
  const contenedorRef = useRef<HTMLDivElement>(null);

  if (prevValue !== value) {
    setPrevValue(value);
    if (value.trim()) {
      setCargando(true);
    } else {
      setResultados([]);
      setCargando(false);
    }
  }

  useEffect(() => {
    const q = value.trim();
    if (!q) {
      seqRef.current += 1;
      return;
    }
    const seq = ++seqRef.current;
    const t = window.setTimeout(async () => {
      try {
        const list = await buscarClientes(q, MAX_RESULTADOS);
        if (seq === seqRef.current) {
          setResultados(list);
          setActivo(-1);
        }
      } finally {
        if (seq === seqRef.current) setCargando(false);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierta(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const seleccionar = (c: ClienteApi) => {
    onSelectCliente({
      id_cliente: Number(c.id_cliente),
      nombre: c.nombre,
      telefono: c.telefono,
      email: c.email,
      ruc_dni: c.ruc_dni,
    });
    setAbierta(false);
    setResultados([]);
    setActivo(-1);
  };

  const manejarTeclado = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!abierta || resultados.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActivo((a) => (a + 1) % resultados.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((a) => (a <= 0 ? resultados.length - 1 : a - 1));
    } else if (e.key === 'Enter') {
      if (activo >= 0 && activo < resultados.length) {
        e.preventDefault();
        seleccionar(resultados[activo]);
      }
    } else if (e.key === 'Escape') {
      setAbierta(false);
    }
  };

  const mostrarDropdown = abierta && value.trim() !== '' && (cargando || resultados.length > 0);

  return (
    <div className="relative" ref={contenedorRef}>
      <Input
        label="Nombre del cliente"
        placeholder="Nombre o razón social"
        value={value}
        role="combobox"
        aria-expanded={mostrarDropdown}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          if (!e.target.value) {
            onSelectCliente(null);
          }
        }}
        onFocus={() => setAbierta(true)}
        onKeyDown={manejarTeclado}
      />

      {mostrarDropdown && (
        <div
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y divide-zinc-100"
        >
          {cargando && resultados.length === 0 ? (
            <div className="p-3 flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="size-3.5 animate-spin text-brand-ink" />
              Buscando clientes…
            </div>
          ) : (
            resultados.map((c, index) => (
              <div
                key={c.id_cliente}
                role="option"
                aria-selected={index === activo}
                onMouseDown={(e) => {
                  e.preventDefault();
                  seleccionar(c);
                }}
                onMouseEnter={() => setActivo(index)}
                className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                  index === activo ? 'bg-brand-soft/60' : 'hover:bg-brand-soft/40'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-700 truncate">{c.nombre}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {[c.ruc_dni, c.telefono].filter(Boolean).join(' · ') || 'Sin documento/teléfono'}
                  </p>
                </div>
                <Search className="size-3.5 text-zinc-300 shrink-0" />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
