'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProductoCarrito } from '../types/cotizacion';

export interface ClienteForm {
  id_cliente: number | null;
  nombre: string;
  telefono: string;
  email: string;
  tipoDocumento: 'DNI' | 'CE' | 'RUC';
  ruc_dni: string;
  clienteEditado: boolean;
}

export interface CrearDraft {
  numeroCotizacion: string;
  cliente: ClienteForm;
  fechaVencimiento: string;
  tipoPago: string;
  tipoPrecioCliente: 'DISTRIBUIDOR' | 'TIENDA';
  items: ProductoCarrito[];
  incluyeCarreta: boolean;
}

interface CrearCotizacionState extends CrearDraft {
  /** ID de la cotización ya creada en BD (si se guardó desde el resumen) */
  idCotizacionGuardada: number | null;
  /** Número con el que se guardó (para no duplicar y mantener el código estable) */
  numeroGuardado: string | null;
  /** ID en edición (flujo lápiz → crear → resumen). null = creación nueva */
  editandoId: number | null;
  setEditandoId: (id: number | null) => void;

  setNumero: (n: string) => void;
  setCliente: (c: Partial<ClienteForm>) => void;
  resetClienteVinculo: () => void;
  setFormulario: (f: Partial<{ fechaVencimiento: string; tipoPago: string; tipoPrecioCliente: 'DISTRIBUIDOR' | 'TIENDA' }>) => void;
  setItems: (items: ProductoCarrito[]) => void;
  addItem: (item: ProductoCarrito) => void;
  removeItem: (id: string) => void;
  setIncluyeCarreta: (v: boolean) => void;
  /** Marca la cotización como guardada (conserva el número para exportar y no duplicar) */
  setCotizacionGuardada: (id: number | null, numero?: string | null) => void;
  /** Sincroniza el borrador en edición (crear) hacia el store persistido */
  saveDraft: (d: CrearDraft) => void;
  hydrateFromCrear: (data: CrearDraft) => void;
  reset: () => void;
}

const initialCliente: ClienteForm = {
  id_cliente: null,
  nombre: '',
  telefono: '',
  email: '',
  tipoDocumento: 'DNI',
  ruc_dni: '',
  clienteEditado: false,
};

const initialDraft: CrearDraft = {
  numeroCotizacion: 'COT-001',
  cliente: initialCliente,
  fechaVencimiento: '',
  tipoPago: '',
  tipoPrecioCliente: 'DISTRIBUIDOR',
  items: [],
  incluyeCarreta: false,
};

export const useCrearCotizacionStore = create<CrearCotizacionState>()(
  persist(
    (set) => ({
      ...initialDraft,
      cliente: { ...initialCliente },
      items: [],
      idCotizacionGuardada: null,
      numeroGuardado: null,
      editandoId: null,
      setEditandoId: (editandoId) => set({ editandoId }),

      setNumero: (numeroCotizacion) => set({ numeroCotizacion }),
      setCliente: (c) => set((s) => ({ cliente: { ...s.cliente, ...c } })),
      resetClienteVinculo: () => set((s) => ({ cliente: { ...s.cliente, id_cliente: null, clienteEditado: false } })),
      setFormulario: (f) => set(f as any),
      setItems: (items) => set({ items }),
      addItem: (item) => set((s) => ({ items: [...s.items, item] })),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      setIncluyeCarreta: (incluyeCarreta) => set({ incluyeCarreta }),
      setCotizacionGuardada: (idCotizacionGuardada, numero) =>
        set((s) => ({
          idCotizacionGuardada,
          numeroGuardado: numero !== undefined ? numero : s.numeroGuardado,
        })),
      saveDraft: (d) =>
        set({
          numeroCotizacion: d.numeroCotizacion,
          cliente: d.cliente,
          fechaVencimiento: d.fechaVencimiento,
          tipoPago: d.tipoPago,
          tipoPrecioCliente: d.tipoPrecioCliente,
          items: d.items,
          incluyeCarreta: d.incluyeCarreta,
        }),
      hydrateFromCrear: (data) =>
        set((s) => ({
          numeroCotizacion: data.numeroCotizacion,
          cliente: data.cliente,
          fechaVencimiento: data.fechaVencimiento,
          tipoPago: data.tipoPago,
          tipoPrecioCliente: data.tipoPrecioCliente,
          items: data.items,
          incluyeCarreta: data.incluyeCarreta,
          // Conservar la cotización guardada solo si el número coincide
          // (revisión con Volver). Si cambió, es un borrador distinto.
          idCotizacionGuardada:
            s.idCotizacionGuardada != null && s.numeroGuardado === data.numeroCotizacion
              ? s.idCotizacionGuardada
              : null,
          numeroGuardado:
            s.idCotizacionGuardada != null && s.numeroGuardado === data.numeroCotizacion
              ? s.numeroGuardado
              : null,
        })),
      reset: () =>
        set({
          ...initialDraft,
          cliente: { ...initialCliente },
          items: [],
          idCotizacionGuardada: null,
          numeroGuardado: null,
          editandoId: null,
        }),
    }),
    {
      name: 'crear-cotizacion-draft',
      // Todo el estado es serializable (strings, numbers, arrays, booleanos, null)
    },
  ),
);
