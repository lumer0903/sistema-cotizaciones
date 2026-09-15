'use client';

import { useState, useCallback } from 'react';
import { ProductoInventario, TipoModal } from '@goldcontinent/shared/types/inventario';

interface UseInventarioModalsReturn {
  modalActivo: TipoModal;
  productoSeleccionado: ProductoInventario | null;
  abrirCrear: () => void;
  abrirEditar: (producto: ProductoInventario) => void;
  abrirDetalle: (producto: ProductoInventario) => void;
  abrirKardex: (producto: ProductoInventario) => void;
  cerrarModales: () => void;
}

export function useInventarioModals(): UseInventarioModalsReturn {
  const [modalActivo, setModalActivo] = useState<TipoModal>(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoInventario | null>(null);

  const abrirCrear = useCallback(() => {
    setProductoSeleccionado(null);
    setModalActivo('CREAR');
  }, []);

  const abrirEditar = useCallback((producto: ProductoInventario) => {
    setProductoSeleccionado(producto);
    setModalActivo('EDITAR');
  }, []);

  const abrirDetalle = useCallback((producto: ProductoInventario) => {
    setProductoSeleccionado(producto);
    setModalActivo('DETALLE');
  }, []);

  const abrirKardex = useCallback((producto: ProductoInventario) => {
    setProductoSeleccionado(producto);
    setModalActivo('KARDEX');
  }, []);

  const cerrarModales = useCallback(() => {
    setModalActivo(null);
    setProductoSeleccionado(null);
  }, []);

  return {
    modalActivo,
    productoSeleccionado,
    abrirCrear,
    abrirEditar,
    abrirDetalle,
    abrirKardex,
    cerrarModales,
  };
}