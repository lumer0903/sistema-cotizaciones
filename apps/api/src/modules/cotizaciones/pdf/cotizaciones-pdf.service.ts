import { Injectable, NotFoundException } from '@nestjs/common';
import { CotizacionesService } from '../cotizaciones.service';

// pdfkit no trae tipos completos en este repo; se importa vía require para evitar issues de build
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

@Injectable()
export class CotizacionesPdfService {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  async generarPdfBuffer(id: number): Promise<{ buffer: Buffer; filename: string }> {
    const cot: any = await this.cotizacionesService.obtenerPorId(id);
    if (!cot) throw new NotFoundException(`Cotización con ID ${id} no encontrada`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const cliente = cot.cliente || {};
    const detalle: any[] = Array.isArray(cot.detalle) ? cot.detalle : [];

    // Encabezado
    doc.fontSize(20).font('Helvetica-Bold').text(`Cotización ${cot.numero || `COT-${String(id).padStart(3, '0')}`}`);
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#555555')
      .text(`Estado: ${String(cot.estado || 'borrador').toUpperCase()}   |   Fecha: ${cot.created_at ? new Date(cot.created_at).toLocaleDateString('es-PE') : '-'}`);
    doc.moveDown(0.8);
    doc.fillColor('#000000');

    // Cliente
    doc.fontSize(12).font('Helvetica-Bold').text('Cliente');
    doc.fontSize(10).font('Helvetica')
      .text(`Nombre: ${cliente.nombre || '-'}`)
      .text(`Doc: ${cliente.ruc_dni || '-'}   |   Tel: ${cliente.telefono || '-'}   |   Email: ${cliente.email || '-'}`);
    doc.moveDown(0.8);

    // Tabla detalle (manual, sin dependencias)
    doc.fontSize(12).font('Helvetica-Bold').text(`Detalle (${detalle.length} items)`);
    doc.moveDown(0.4);
    const colX = [50, 130, 330, 390, 440];
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('CÓDIGO', colX[0], doc.y, { width: 75 });
    doc.text('DESCRIPCIÓN', colX[1], doc.y - 11, { width: 195 });
    doc.text('PRECIO', colX[2], doc.y - 11, { width: 55, align: 'right' });
    doc.text('CANT', colX[3], doc.y - 11, { width: 45, align: 'right' });
    doc.text('TOTAL', colX[4], doc.y - 11, { width: 65, align: 'right' });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(9);
    let subtotal = 0;
    for (const d of detalle) {
      const prod = d.producto || {};
      const codigo = String(prod.codigo || d.codigo || '-');
      const desc = String(prod.descripcion || d.descripcion || '-').slice(0, 60);
      const precio = Number(d.precio_unitario ?? 0);
      const cant = Number(d.cantidad ?? 0);
      const tot = precio * cant;
      subtotal += tot;
      const y = doc.y;
      if (y > 720) doc.addPage();
      doc.text(codigo, colX[0], doc.y, { width: 75 });
      doc.text(desc, colX[1], doc.y - 11, { width: 195 });
      doc.text(`S/ ${precio.toFixed(2)}`, colX[2], doc.y - 11, { width: 55, align: 'right' });
      doc.text(String(cant), colX[3], doc.y - 11, { width: 45, align: 'right' });
      doc.text(`S/ ${tot.toFixed(2)}`, colX[4], doc.y - 11, { width: 65, align: 'right' });
      doc.moveDown(0.4);
    }

    const costoCarreta = Number(cot.costo_carreta ?? 0);
    // IGV DESACTIVADO: los precios ya incluyen IGV.
    // Para reactivar en una próxima actualización: habilitar cálculo de IGV 18% aquí
    // y alinear con frontend (crear/resumen/editar) + CotizacionesService.
    const total = subtotal + costoCarreta;
    doc.moveDown(0.6);
    doc.fontSize(10);
    doc.text(`Subtotal: S/ ${subtotal.toFixed(2)}`, { align: 'right' });
    doc.text(`Carreta: S/ ${costoCarreta.toFixed(2)}`, { align: 'right' });
    doc.font('Helvetica-Bold').fontSize(12).text(`Total: S/ ${total.toFixed(2)}`, { align: 'right' });

    doc.end();
    const buffer = await done;
    const filename = `${String(cot.numero || `COT-${id}`).replace(/[^A-Za-z0-9-_]+/g, '_')}.pdf`;
    return { buffer, filename };
  }
}
