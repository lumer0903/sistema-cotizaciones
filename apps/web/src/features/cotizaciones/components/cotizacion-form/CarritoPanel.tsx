'use client';

import { useMemo, useRef, useState } from 'react';
import { Search, ShoppingCart, X, Loader2, ChevronRight, Sparkles, Trash2 } from 'lucide-react';
import { Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button } from '@/components/ui';
import { ProductoCarrito, getItemTotal } from '@/features/cotizaciones/types/cotizacion';
import type { ProductoBase } from '@/features/cotizaciones/components/AgregarProductoModal';

export interface CarritoPanelProps {
  items: ProductoCarrito[];
  selectedItemId: string | null;
  productos: ProductoBase[];
  isLoadingProductos: boolean;
  onSelectProducto: (producto: ProductoBase) => void;
  onAbrirRecomendaciones: (itemId: string) => void;
  onEliminarItem: (itemId: string) => void;
}

/**
 * Buscador de catálogo + tabla de carrito.
 * Ownear el estado del input/dropdown es responsabilidad interna; el catálogo llega por props
 * porque también lo consume la columna derecha (RecomendacionesPanel).
 */
export function CarritoPanel({
  items,
  selectedItemId,
  productos,
  isLoadingProductos,
  onSelectProducto,
  onAbrirRecomendaciones,
  onEliminarItem,
}: CarritoPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const resultadosBusqueda = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return productos
      .filter((p) => p.codigo?.toLowerCase().includes(query) || p.descripcion?.toLowerCase().includes(query))
      .slice(0, 3);
  }, [searchQuery, productos]);

  const handleSeleccionarProducto = (producto: ProductoBase) => {
    onSelectProducto(producto);
    setShowDropdown(false);
    setSearchQuery('');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/80 space-y-4">
      <h2 className="text-lg font-bold text-zinc-700">Carrito</h2>

      <div className="relative">
        <div className="relative">
          <Input
            ref={searchInputRef}
            placeholder="Escribe el código o nombre del producto (ej: RY-)..."
            icon={
              isLoadingProductos ? (
                <Loader2 className="size-4 animate-spin text-accent-ink" />
              ) : (
                <Search className="size-4 text-accent-ink" />
              )
            }
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          {searchQuery && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setSearchQuery('');
                  setShowDropdown(false);
                }}
                aria-label="Limpiar búsqueda"
                className="!px-1.5"
              >
                <X className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {showDropdown && searchQuery.trim() !== '' && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y divide-zinc-100">
              {resultadosBusqueda.length > 0 ? (
                resultadosBusqueda.map((prod, index) => (
                  <div
                    key={prod.id || prod.codigo || index}
                    onClick={() => handleSeleccionarProducto(prod)}
                    className="group p-3 hover:bg-zinc-50 cursor-pointer transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-bold text-xs bg-surface-muted px-2 py-1 rounded text-zinc-700 border border-stone-200 uppercase shrink-0">
                        {String(prod.codigo).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-700 leading-tight truncate">{prod.descripcion}</p>
                        {typeof prod.stockTotal === 'number' && (
                          <p className="text-xs text-zinc-500 mt-0.5 tnum">Stock: {prod.stockTotal}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      className="size-4 shrink-0 text-zinc-300 group-hover:text-accent-primary transition-colors"
                      aria-hidden="true"
                    />
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-zinc-500">
                  {isLoadingProductos
                    ? 'Cargando catálogo...'
                    : `No se encontraron productos importados con "${searchQuery}"`}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {items.length === 0 ? (
        <div
          onClick={() => searchInputRef.current?.focus()}
          className="h-44 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col justify-center items-center gap-2 cursor-pointer hover:bg-surface-muted/80 transition-colors"
        >
          <ShoppingCart className="size-8 text-zinc-300" />
          <span className="text-zinc-500 font-medium text-xs">Busca un producto importado arriba para agregarlo</span>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CÓDIGO</TableHead>
              <TableHead>PRECIO UNITARIO</TableHead>
              <TableHead>CANTIDAD</TableHead>
              <TableHead>TOTAL</TableHead>
              <TableHead className="text-center">ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className={selectedItemId === item.id ? 'bg-accent-soft/60' : ''}>
                <TableCell className="font-bold text-zinc-800">{item.codigo}</TableCell>
                <TableCell className="text-zinc-600">S/ {item.precioUnitario.toFixed(2)}</TableCell>
                <TableCell className="text-zinc-600">{item.cantidad}</TableCell>
                <TableCell className="font-bold text-zinc-800">S/ {getItemTotal(item).toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex justify-center items-center gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onAbrirRecomendaciones(item.id)}
                      aria-label={`Ver recomendaciones IA de ${item.codigo}`}
                      title="Ver recomendaciones IA"
                      className={`!px-1.5 ${
                        selectedItemId === item.id
                          ? '!bg-accent-selection !text-accent-ink outline outline-1 outline-offset-[-1px] outline-brand-modalFocus'
                          : '!text-zinc-500 hover:!text-accent-ink'
                      }`}
                    >
                      <Sparkles className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onEliminarItem(item.id)}
                      aria-label={`Eliminar ${item.codigo} del carrito`}
                      title="Eliminar del carrito"
                      className="!px-1.5 !text-zinc-500 hover:!text-red-500"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
