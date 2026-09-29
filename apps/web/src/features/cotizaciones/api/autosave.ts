import {
  crearCliente,
  buscarClientes,
  crearCotizacion,
  actualizarCotizacion,
  type CrearCotizacionPayload,
  type ActualizarCotizacionPayload,
} from './cotizacionApi';

export interface AutosaveCliente {
  id_cliente: number | null;
  nombre: string;
  telefono?: string;
  email?: string;
  ruc_dni?: string;
  clienteEditado?: boolean;
}

export interface AutosaveItem {
  id_producto?: number;
  tipo_venta?: string;
  cantidad: number;
  precioUnitario?: number;
  precio_unitario?: number;
  observacion?: string | null;
  es_sugerido_ia?: boolean;
}

export interface AutosaveParams {
  cliente: AutosaveCliente;
  items: AutosaveItem[];
  tipoPrecioCliente: 'DISTRIBUIDOR' | 'TIENDA';
  incluyeCarreta: boolean;
  costoCarreta?: number;
  observaciones?: string;
  numero?: string | null;
  /** Si ya existe en BD, hace PATCH en vez de POST */
  idCotizacionGuardada?: number | null;
  tipoPago?: string;
  fechaVencimiento?: string;
}

export function puedeAutosave(cliente: AutosaveCliente, items: AutosaveItem[]): boolean {
  if (items.length === 0) return false;
  if (!items.some((it) => Number(it.id_producto ?? 0) > 0)) return false;
  // Cliente ya vinculado por id no requiere nombre en memoria
  if (cliente.id_cliente && !cliente.clienteEditado) return true;
  if (cliente.id_cliente && cliente.clienteEditado && cliente.nombre.trim()) return true;
  return cliente.nombre.trim().length > 0;
}

async function ensureCliente(
  cliente: AutosaveCliente,
  tipoPrecio: 'DISTRIBUIDOR' | 'TIENDA'
): Promise<number> {
  if (cliente.id_cliente && !cliente.clienteEditado) {
    return cliente.id_cliente;
  }
  if (!cliente.nombre.trim()) {
    throw new Error('El nombre del cliente es obligatorio para guardar');
  }
  if (cliente.id_cliente && cliente.clienteEditado) {
    const { actualizarCliente } = await import('./cotizacionApi');
    await actualizarCliente(cliente.id_cliente, {
      nombre: cliente.nombre.trim(),
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      ruc_dni: cliente.ruc_dni || '',
      tipo: tipoPrecio === 'DISTRIBUIDOR' ? 'distribuidor' : 'normal',
    });
    return cliente.id_cliente;
  }
  // Evitar duplicados: si ya existe un cliente con el mismo nombre exacto, reutilizarlo
  const nombreBuscado = cliente.nombre.trim();
  const existentes = await buscarClientes(nombreBuscado, 10);
  const exacto = existentes.find(
    (c) => String(c.nombre || '').trim().toLowerCase() === nombreBuscado.toLowerCase()
  );
  if (exacto) {
    return Number(exacto.id_cliente);
  }
  const nuevo = await crearCliente({
    nombre: nombreBuscado,
    telefono: cliente.telefono || undefined,
    email: cliente.email || undefined,
    ruc_dni: cliente.ruc_dni || undefined,
    tipo: tipoPrecio === 'DISTRIBUIDOR' ? 'distribuidor' : 'normal',
  });
  return Number(nuevo.id_cliente);
}

function construirDetalle(items: AutosaveItem[]) {
  return items
    .filter((it) => Number(it.id_producto ?? 0) > 0)
    .map((it) => ({
      id_producto: Number(it.id_producto),
      tipo_venta: String(it.tipo_venta || 'MAYOR').toLowerCase(),
      cantidad: Number(it.cantidad),
      precio_unitario: Number(it.precioUnitario ?? it.precio_unitario ?? 0),
      color_notas: it.observacion ?? null,
      es_sugerido_ia: Boolean(it.es_sugerido_ia),
    }));
}

export interface AutosaveResultado {
  idCotizacion: number;
  idCliente: number;
}

/** Guarda borrador en servidor. Devuelve ids de cotización y cliente, o null si no hay datos suficientes. */
export async function autosaveCotizacion(
  params: AutosaveParams
): Promise<AutosaveResultado | null> {
  const { cliente, items } = params;
  if (!puedeAutosave(cliente, items)) return null;

  const detalle = construirDetalle(items);
  if (detalle.length === 0) return null;

  const idCliente = await ensureCliente(cliente, params.tipoPrecioCliente);
  const observaciones =
    params.observaciones ||
    `Vencimiento: ${params.fechaVencimiento || '-'} | Pago: ${params.tipoPago || '-'}`;

  const base = {
    id_cliente: idCliente,
    tipo_precio: params.tipoPrecioCliente === 'DISTRIBUIDOR' ? 'distribuidor' : 'normal',
    observaciones,
    incluye_carreta: params.incluyeCarreta,
    costo_carreta: params.costoCarreta ?? (params.incluyeCarreta ? 15 : 0),
    fecha_vencimiento: params.fechaVencimiento || null,
    detalle,
  };

  if (params.idCotizacionGuardada != null) {
    const payload: ActualizarCotizacionPayload = base;
    await actualizarCotizacion(params.idCotizacionGuardada, payload);
    return { idCotizacion: params.idCotizacionGuardada, idCliente };
  }

  try {
    const cot = await crearCotizacion({
      ...(base as CrearCotizacionPayload),
      ...(params.numero ? { numero: params.numero } : {}),
    });
    const id = Number(cot?.id_cotizacion ?? cot?.id ?? 0);
    return id > 0 ? { idCotizacion: id, idCliente } : null;
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('correlativo') || msg.includes('duplicate') || msg.includes('unique')) {
      const cot = await crearCotizacion(base as CrearCotizacionPayload);
      const id = Number(cot?.id_cotizacion ?? cot?.id ?? 0);
      return id > 0 ? { idCotizacion: id, idCliente } : null;
    }
    throw err;
  }
}
