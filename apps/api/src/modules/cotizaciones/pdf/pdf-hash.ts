import { createHash } from 'crypto';

/**
 * Hash determinista del contenido renderizado en el PDF.
 * Cubre exactamente los campos que consume buildHtml(): si alguno cambia,
 * el hash deja de coincidir y el PDF se regenera.
 */
export function computePdfHash(cot: any): string {
  const detalle: any[] = Array.isArray(cot.detalle) ? cot.detalle : [];
  const cliente = cot.cliente || {};

  const payload = {
    numero: cot.numero ?? null,
    estado: cot.estado ?? null,
    created_at: cot.created_at ? new Date(cot.created_at).toISOString() : null,
    tipo_precio: cot.tipo_precio ?? null,
    fecha_vencimiento: cot.fecha_vencimiento
      ? new Date(cot.fecha_vencimiento).toISOString()
      : null,
    observaciones: cot.observaciones ?? null,
    incluye_carreta: Boolean(cot.incluye_carreta),
    costo_carreta: Number(cot.costo_carreta ?? 0),
    cliente: {
      nombre: cliente.nombre ?? null,
      ruc_dni: cliente.ruc_dni ?? null,
      telefono: cliente.telefono ?? null,
      email: cliente.email ?? null,
    },
    detalle: detalle.map((d) => ({
      id_producto: d.id_producto ?? null,
      codigo: d.producto?.codigo ?? d.codigo ?? null,
      descripcion: d.producto?.descripcion ?? d.descripcion ?? null,
      cantidad: Number(d.cantidad ?? 0),
      precio_unitario: Number(d.precio_unitario ?? 0),
      color_notas: d.color_notas ?? null,
    })),
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
