export interface EscalaPrecio {
    unidad: number | null;
    docena: number | null;
    mayor: number | null;
}

export interface ProductoConsulta {
    id: string;
    codigo: string;
    descripcion: string;
    stock: number;
    stockMinimo?: number | null;
    imagenUrl?: string;
    precioDistribuidor: EscalaPrecio;
    precioTienda: EscalaPrecio;
}
