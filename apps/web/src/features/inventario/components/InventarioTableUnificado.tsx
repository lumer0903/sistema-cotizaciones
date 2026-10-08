interface InventarioTableProps {
  productos: any[];
  loading?: boolean;
  _onEditar: (producto: any) => void;
  _onEliminar: (id: number) => void;
}

export function InventarioTableUnificado({
  productos,
  loading = false,
  _onEditar,
  _onEliminar,
}: InventarioTableProps) {
  if (loading) return null;
  if (productos.length === 0) return null;
  // Tabla renderizada por el padre
}