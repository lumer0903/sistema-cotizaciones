'use client';

import { useCotizacionForm } from '@/features/cotizaciones/hooks/useCotizacionForm';
import AgregarProductoModal from '@/features/cotizaciones/components/AgregarProductoModal';
import { RecomendacionesPanel } from '@/features/cotizaciones/components/RecomendacionesPanel';
import { ResumenCotizacionCard } from '@/features/cotizaciones/components/ResumenCotizacionCard';
import { FormularioHeader } from '@/features/cotizaciones/components/cotizacion-form/FormularioHeader';
import { InformacionGeneral } from '@/features/cotizaciones/components/cotizacion-form/InformacionGeneral';
import { CarritoPanel } from '@/features/cotizaciones/components/cotizacion-form/CarritoPanel';

interface CotizacionFormularioProps {
  /** 'crear' = cotización nueva (pide correlativo, ?nueva=1); 'editar' = hidratación desde servidor (autosave en PATCH) */
  modo: 'crear' | 'editar';
}

export function CotizacionFormulario({ modo }: CotizacionFormularioProps) {
  const f = useCotizacionForm(modo);

  const hayContenido = f.items.length > 0 || f.nombre.trim() !== '' || f.rucDni.trim() !== '';

  return (
    <div className="w-full max-w-[1700px] mx-auto space-y-6 font-sans">
      <FormularioHeader
        numeroCotizacion={f.numeroCotizacion}
        hayContenido={hayContenido}
        onLimpiar={f.handleLimpiar}
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Columna Izquierda: Formulario y Carrito */}
        <div className="col-span-12 lg:col-span-8 min-w-0 space-y-6">
          <InformacionGeneral
            cliente={f.clienteForm}
            onClienteChange={(patch) => {
              if ('nombre' in patch) f.setNombre(patch.nombre ?? '');
              if ('telefono' in patch) f.setTelefono(patch.telefono ?? '');
              if ('email' in patch) f.setEmail(patch.email ?? '');
              if ('tipoDocumento' in patch && patch.tipoDocumento) f.setTipoDocumento(patch.tipoDocumento);
              if ('ruc_dni' in patch) f.setRucDni(patch.ruc_dni ?? '');
              if (patch.clienteEditado !== undefined) f.setClienteEditado(patch.clienteEditado);
            }}
            onSelectClienteExistente={f.handleSelectClienteExistente}
            tipoPrecioCliente={f.tipoPrecioCliente}
            onTipoPrecioClienteChange={f.setTipoPrecioCliente}
            fechaVencimiento={f.fechaVencimiento}
            onFechaVencimientoChange={f.setFechaVencimiento}
            tipoPago={f.tipoPago}
            onTipoPagoChange={f.setTipoPago}
          />

          <CarritoPanel
            items={f.items}
            selectedItemId={f.selectedItemId}
            productos={f.productosApi}
            isLoadingProductos={f.isLoadingProductos}
            onSelectProducto={f.handleSelectProducto}
            onAbrirRecomendaciones={f.handleAbrirRecomendaciones}
            onEliminarItem={f.handleEliminarItem}
          />
        </div>

        {/* Columna Derecha: Resumen y Recomendaciones */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <ResumenCotizacionCard
            itemsCount={f.items.length}
            subtotal={f.subtotal}
            incluyeCarreta={f.incluyeCarreta}
            costoCarreta={f.costoCarreta}
            total={f.total}
            onToggleCarreta={f.setIncluyeCarreta}
            continuarDisabled={f.items.length === 0}
            onContinuar={f.handleContinuar}
          />

          <RecomendacionesPanel
            cartItems={f.items}
            selectedItemId={f.selectedItemId}
            tipoPrecioCliente={f.tipoPrecioCliente}
            idCliente={f.idCliente ?? undefined}
            itemExistenteId={f.selectedItemId}
            refreshKey={f.refreshKeyRecs}
            productosCatalogo={f.productosApi}
            onSelectAgregar={f.handleSelectAgregar}
            onSelectReemplazar={f.handleSelectReemplazar}
          />
        </div>
      </div>

      <AgregarProductoModal
        isOpen={f.isModalOpen}
        onClose={f.handleCloseModal}
        producto={f.productoParaModal}
        tipoPrecioCliente={f.tipoPrecioCliente}
        onAgregar={f.handleAgregarProducto}
        cantidadInicial={f.modalRecContexto?.cantidadInicial}
        precioInicial={f.modalRecContexto?.precioInicial}
        tipoVentaInicial={f.modalRecContexto?.tipoVentaInicial}
        aviso={f.modalRecContexto?.aviso}
        confirmLabel={f.modalRecContexto?.confirmLabel}
      />
    </div>
  );
}
