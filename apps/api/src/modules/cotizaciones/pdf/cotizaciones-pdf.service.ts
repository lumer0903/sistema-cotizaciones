import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { Browser } from 'puppeteer';
import { CotizacionesService } from '../cotizaciones.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const puppeteer = require('puppeteer');

function money(n: number | string | null | undefined): string {
  const v = Number(n || 0);
  return v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fechaCorta(value: string | null | undefined): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('es-PE');
  } catch {
    return '-';
  }
}

@Injectable()
export class CotizacionesPdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CotizacionesPdfService.name);
  private browser: Browser | null = null;
  private browserPromise: Promise<Browser> | null = null;

  constructor(private readonly cotizacionesService: CotizacionesService) {}

  async onModuleInit() {
    // Warmup: lanza Chromium en segundo plano (no bloquea el boot de Nest)
    this.ensureBrowser().catch((e) => {
      this.logger.warn(`Puppeteer no pudo pre-lanzarse: ${e?.message ?? e}`);
    });
  }

  async onModuleDestroy() {
    const b = this.browser;
    this.browser = null;
    this.browserPromise = null;
    if (b) {
      try {
        await b.close();
      } catch {
        /* browser ya cerrado */
      }
    }
  }

  private async ensureBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) return this.browser;
    if (!this.browserPromise) {
      this.browserPromise = puppeteer
        .launch({
          headless: true,
          args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        })
        .then((b: Browser) => {
          this.browser = b;
          this.browserPromise = null;
          b.on('disconnected', () => {
            if (this.browser === b) this.browser = null;
          });
          return b;
        })
        .catch((e: unknown) => {
          this.browserPromise = null;
          throw e;
        });
    }
    const activo: Promise<Browser> | null = this.browserPromise;
    if (!activo) throw new Error('No se pudo iniciar Chromium (Puppeteer)');
    return activo;
  }

  private buildHtml(cot: any): string {
    const cliente = cot.cliente || {};
    const detalle: any[] = Array.isArray(cot.detalle) ? cot.detalle : [];
    const numero = esc(cot.numero || `COT-${String(cot.id_cotizacion ?? '').padStart(3, '0')}`);
    const estado = esc(String(cot.estado || 'borrador').toUpperCase());
    const fecha = esc(fechaCorta(cot.created_at || cot.fecha));
    const tipoPrecio = esc(String(cot.tipo_precio || '-').toUpperCase());

    let subtotal = 0;
    const rows = detalle
      .map((d, i) => {
        const prod = d.producto || {};
        const codigo = esc(prod.codigo || d.codigo || '-');
        const desc = esc(String(prod.descripcion || d.descripcion || '-'));
        const precio = Number(d.precio_unitario ?? 0);
        const cant = Number(d.cantidad ?? 0);
        const tot = precio * cant;
        subtotal += tot;
        const bg = i % 2 === 0 ? '#ffffff' : '#fafafa';
        return `<tr style="background:${bg}">
            <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:600">${codigo}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee">${desc}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">S/ ${money(precio)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${cant}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600">S/ ${money(tot)}</td>
          </tr>`;
      })
      .join('');

    const costoCarreta = Number(cot.costo_carreta ?? 0);
    const total = subtotal + costoCarreta;

    const estadoColor =
      estado === 'BORRADOR' ? '#6b7280' : estado === 'ENVIADA' || estado === 'ENVIADO' ? '#2563eb' : '#16a34a';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Cotización ${numero}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #18181b; font-size: 12px; }
    .page { padding: 36px 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #f8b602; padding-bottom: 16px; margin-bottom: 20px; }
    .brand { font-size: 22px; font-weight: 800; color: #f8b602; letter-spacing: -0.5px; }
    .brand small { display: block; font-size: 10px; color: #71717a; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 18px; font-weight: 800; }
    .doc-title p { color: #52525b; font-size: 11px; margin-top: 4px; }
    .badge { display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; color: ${estadoColor}; border: 1px solid ${estadoColor}; }
    .meta { display: flex; gap: 24px; margin-bottom: 18px; }
    .card { flex: 1; background: #f8fafc; border: 1px solid #e4e4e7; border-radius: 10px; padding: 12px 14px; }
    .card h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #71717a; margin-bottom: 8px; }
    .card p { margin: 2px 0; font-size: 12px; }
    .card strong { color: #18181b; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    thead th { background: #18181b; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; padding: 9px 10px; text-align: left; }
    thead th:nth-child(3), thead th:nth-child(5) { text-align: right; }
    thead th:nth-child(4) { text-align: center; }
    .totals { margin-top: 16px; margin-left: auto; width: 260px; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color: #52525b; }
    .totals .row.total { border-top: 2px solid #f8b602; margin-top: 4px; padding-top: 10px; font-size: 15px; font-weight: 800; color: #18181b; }
    .totals .row.total span:last-child { color: #f8b602; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e4e4e7; font-size: 10px; color: #a1a1aa; text-align: center; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">GOLD CONTINENT<small>Floristería &amp; Distribución</small></div>
      <div class="doc-title">
        <h1>Cotización ${numero}</h1>
        <p>Fecha: ${fecha} · Tipo precio: ${tipoPrecio}</p>
        <span class="badge">${estado}</span>
      </div>
    </div>

    <div class="meta">
      <div class="card">
        <h3>Cliente</h3>
        <p><strong>${esc(cliente.nombre || '-')}</strong></p>
        <p>Doc: ${esc(cliente.ruc_dni || '-')} · Tel: ${esc(cliente.telefono || '-')}</p>
        <p>Email: ${esc(cliente.email || '-')}</p>
      </div>
      <div class="card">
        <h3>Resumen</h3>
        <p>Ítems: <strong>${detalle.length}</strong></p>
        <p>Vencimiento: <strong>${esc(fechaCorta(cot.fecha_vencimiento))}</strong></p>
        <p>Pago: <strong>${esc(String(cot.observaciones || '-').slice(0, 80))}</strong></p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Descripción</th>
          <th>Precio</th>
          <th>Cant</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#a1a1aa">Sin ítems</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>S/ ${money(subtotal)}</span></div>
      <div class="row"><span>Carreta</span><span>S/ ${money(costoCarreta)}</span></div>
      <div class="row total"><span>Total</span><span>S/ ${money(total)}</span></div>
    </div>

    <div class="footer">Documento generado por Gold Continent · Vista previa y descarga con el mismo archivo PDF</div>
  </div>
</body>
</html>`;
  }

  async generarPdfBuffer(id: number): Promise<{ buffer: Buffer; filename: string }> {
    const cot: any = await this.cotizacionesService.obtenerPorId(id);
    if (!cot) throw new NotFoundException(`Cotización con ID ${id} no encontrada`);

    const browser = await this.ensureBrowser();
    const page = await browser.newPage();
    try {
      const html = this.buildHtml(cot);
      await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
      });
      const buffer = Buffer.from(pdf);
      const filename = `${String(cot.numero || `COT-${id}`).replace(/[^A-Za-z0-9-_]+/g, '_')}.pdf`;
      return { buffer, filename };
    } finally {
      await page.close().catch(() => undefined);
    }
  }
}
