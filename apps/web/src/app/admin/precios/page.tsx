'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

import { Input, Select, FilterCard, Pagination } from '@/components/ui';
import { PriceCard } from '@/features/precio-historial/components/PriceCard';
import { HistorialPrecioModal } from '@/features/precio-historial/components/HistorialPrecioModal';
import { ProductoConsulta } from '@/features/precio-historial/types/precio';
import {
  getProductosConsulta,
  getHistorialPrecios,
  HistorialPrecioItem,
} from '@/features/precio-historial/api/precioApi';

export default function ConsultaPrecioPage() {
  const [productos, setProductos] = useState<ProductoConsulta[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [tipoPrecio, setTipoPrecio] = useState<'distribuidor' | 'tienda' | ''>('');
  const [stockFiltro, setStockFiltro] = useState('');
  const [vista, setVista] = useState<'grid' | 'list'>('grid');

  // Paginación con el estado global de limite
  const [paginaActual, setPaginaActual] = useState(1);
  const [limit, setLimit] = useState(8);

  const [productoHistorialId, setProductoHistorialId] = useState<string | null>(null);
  const [historialData, setHistorialData] = useState<HistorialPrecioItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  useEffect(() => {
    getProductosConsulta().then((data) => setProductos(data));
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, stockFiltro]);

  const handleVerHistorial = async (id: string) => {
    setLoadingHistorial(true);
    try {
      const data = await getHistorialPrecios(id);
      setHistorialData(data);
      setProductoHistorialId(id);
    } catch (error) {
      console.error('Error cargando historial:', error);
      toast.error('No se pudo cargar el historial de precios');
      setHistorialData([]);
      setProductoHistorialId(id);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleCerrarHistorial = () => {
    setProductoHistorialId(null);
    setHistorialData([]);
  };

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideBusqueda =
        !busqueda ||
        p.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(busqueda.toLowerCase());

      const filtroNormalizado = stockFiltro.toLowerCase();
      const esFiltroBajo = filtroNormalizado === 'bajo' || filtroNormalizado === 'stock-bajo';
      const esFiltroDisponible = filtroNormalizado === 'disponible' || filtroNormalizado === 'con-stock';

      const stockMin = (p as any).stockMinimo ?? (p as any).stock_minimo ?? 10;

      const coincideStock =
        !stockFiltro ||
        (esFiltroDisponible && p.stock > 0) ||
        (esFiltroBajo && p.stock <= stockMin);

      return coincideBusqueda && coincideStock;
    });
  }, [productos, busqueda, stockFiltro]);

  // Cálculos de paginación
  const totalItems = productosFiltrados.length;
  const totalPaginas = Math.ceil(totalItems / limit) || 1;
  const inicio = (paginaActual - 1) * limit;
  const productosVisibles = productosFiltrados.slice(inicio, inicio + limit);

  const codigoProductoSeleccionado = productos.find(
    (p) => String(p.id) === String(productoHistorialId)
  )?.codigo;

  return (
    <div className="p-0 md:p-0 w-full max-w-[1700px] mx-auto space-y-6 font-['DM_Sans']">
      {/* Filtros */}
      <FilterCard>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* BUSCAR */}
          <div className="md:col-span-6">
            <Input
              label="BUSCAR"
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar"
              icon={<Search className="size-4" />}
            />
          </div>

          {/* TIPO PRECIO */}
          <div className="md:col-span-3">
            <Select
              label="TIPO PRECIO"
              value={tipoPrecio}
              onChange={(e) => setTipoPrecio(String(e.target.value) as 'distribuidor' | 'tienda' | '')}
              options={[
                { label: 'Seleccionar', value: '' },
                { label: 'DISTRIBUIDOR', value: 'distribuidor' },
                { label: 'TIENDA', value: 'tienda' },
              ]}
            />
          </div>

          {/* STOCK */}
          <div className="md:col-span-3">
            <Select
              label="STOCK"
              value={stockFiltro}
              onChange={(e) => setStockFiltro(String(e.target.value))}
              options={[
                { label: 'Seleccionar', value: '' },
                { label: 'DISPONIBLE', value: 'disponible' },
                { label: 'STOCK BAJO', value: 'bajo' },
              ]}
            />
          </div>
        </div>
      </FilterCard>

      {/* Grid de PriceCard */}
      <div
        className={
          vista === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4'
            : 'flex flex-col gap-4'
        }
      >
        {productosVisibles.map((producto, index) => (
          <PriceCard
            key={producto.id ?? producto.codigo ?? `prod-${index}`}
            producto={producto}
            tipoPrecio={tipoPrecio}
            onVerHistorial={handleVerHistorial}
          />
        ))}
      </div>

      {/* Paginación */}
      <Pagination
        currentPage={paginaActual}
        totalPages={totalPaginas}
        totalItems={totalItems}
        limit={limit}
        onPageChange={setPaginaActual}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPaginaActual(1);
        }}
        itemLabel="productos"
      />

      {/* Modal Historial */}
      <HistorialPrecioModal
        open={productoHistorialId !== null}
        onClose={handleCerrarHistorial}
        codigoProducto={codigoProductoSeleccionado}
        historial={historialData}
      />
    </div>
  );
}