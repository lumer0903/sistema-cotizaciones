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
    productoSeleccionadoId: string | number | null;
}