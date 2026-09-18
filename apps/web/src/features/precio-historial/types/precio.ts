export interface EscalaPrecio {
    unidad: number;
    docena: number;
    mayor: number;
}

export interface ProductoConsulta {
    id: string;
    codigo: string;
    descripcion: string;
    stock: number;
    imagenUrl?: string;
    precioDistribuidor: EscalaPrecio;
    precioTienda: EscalaPrecio;
}