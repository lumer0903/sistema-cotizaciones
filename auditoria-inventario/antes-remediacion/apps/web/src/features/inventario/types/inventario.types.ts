export interface FiltrosInventario {
    busqueda?: string;
    categoriaId?: string | number;
    almacenId?: string | number;
    pagina?: number;
    limite?: number;
}

export interface EstadoModalInventario {
    crearAbierto: boolean;
    editarAbierto: boolean;
    eliminarAbierto: boolean;
    detalleAbierto: boolean;
    ajustarStockAbierto: boolean;
    movimientoAbierto: boolean;
    transferenciaAbierto: boolean;
    alertasAbierto: boolean;
    productoSeleccionadoId: string | number | null;
    productoParaMovimientoId: string | number | null;
}

export interface FiltrosMovimientos {
    id_producto?: number;
    id_almacen?: number;
    tipo?: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
    origen?: 'compra' | 'venta' | 'devolucion_cliente' | 'ajuste_fisico' | 'merma' | 'transferencia' | 'cotizacion_aprobada';
    fecha_inicio?: string;
    fecha_fin?: string;
    pagina?: number;
    limite?: number;
}

export interface FiltrosStock {
    id_producto?: number;
    id_almacen?: number;
    soloBajoMinimo?: boolean;
}

export interface MovimientoFormData {
    id_producto: number;
    id_almacen: number;
    tipo: 'entrada' | 'salida' | 'ajuste';
    origen: 'compra' | 'venta' | 'devolucion_cliente' | 'ajuste_fisico' | 'merma' | 'transferencia' | 'cotizacion_aprobada';
    cantidad: number;
    costo_unitario?: number | null;
    observaciones?: string;
}

export interface TransferenciaFormData {
    id_producto: number;
    id_almacen_origen: number;
    id_almacen_destino: number;
    cantidad: number;
    observaciones?: string;
}