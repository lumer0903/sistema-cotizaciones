import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { Browser } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { CotizacionesService } from '../cotizaciones.service';
import { ConfiguracionService } from '../../configuracion/configuracion.service';
import { computePdfHash } from './pdf-hash';

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

function fechaCorta(value: string | Date | null | undefined): string {
  if (!value) return '-';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '-';
  }
}

interface PooledBrowser {
  browser: Browser;
  inUse: boolean;
  lastUsed: number;
  jobCount: number;
}

@Injectable()
export class CotizacionesPdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CotizacionesPdfService.name);
  private readonly MAX_POOL_SIZE = 2;
  private readonly MAX_JOBS_PER_BROWSER = 50;
  private readonly HEALTH_CHECK_INTERVAL_MS = 30_000;
  private readonly BROWSER_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

  private pool: PooledBrowser[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private initializing = false;

  private logoBase64 = '';
  private razonSocial = 'IMPORT & EXPORT GOLD CONTINENT';
  private ruc = '20523652525';
  private direccion = '';
  private telefono = '';
  private email = '';
  private bancoPrincipal = '';
  private cuentaPrincipal = '';
  private titularPrincipal = '';
  private cciPrincipal = '';
  private bancoSecundario = '';
  private cuentaSecundaria = '';
  private titularSecundaria = '';
  private cciSecundaria = '';
  private terminosCondiciones = '';

  constructor(
    private readonly cotizacionesService: CotizacionesService,
    private readonly configuracionService: ConfiguracionService
  ) { }

  async onModuleInit() {
    this.loadLogo();
    // Warmup pool in background
    this.warmupPool().catch((e) => {
      this.logger.warn(`Puppeteer pool warmup failed: ${e?.message ?? e}`);
    });
    // Load company config from database
    this.loadCompanyConfig().catch((e) => {
      this.logger.warn(`Failed to load company config: ${e?.message ?? e}`);
    });
  }

  private loadLogo(): void {
    const possiblePaths = [
      path.resolve(__dirname, '../../../assets/LOGO_GRANDE.svg'),
      path.resolve(__dirname, '../../assets/LOGO_GRANDE.svg'),
      path.resolve(__dirname, '../assets/LOGO_GRANDE.svg'),
      path.resolve(process.cwd(), 'apps/api/src/assets/LOGO_GRANDE.svg'),
      path.resolve(process.cwd(), 'src/assets/LOGO_GRANDE.svg'),
      path.resolve(process.cwd(), 'apps/web/public/LOGO_GRANDE.svg'),
      path.resolve(process.cwd(), 'public/LOGO_GRANDE.svg'),
    ];

    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          const svgContent = fs.readFileSync(p);
          this.logoBase64 = `data:image/svg+xml;base64,${svgContent.toString('base64')}`;
          this.logger.log(`Logo corporativo cargado exitosamente desde: ${p}`);
          return;
        }
      } catch {
        // Continue searching
      }
    }
    this.logger.warn('No se encontró el archivo de logo LOGO_GRANDE.svg en las rutas esperadas');
  }

  async onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    await this.shutdownPool();
  }

  private async warmupPool(): Promise<void> {
    if (this.initializing) return;
    this.initializing = true;
    try {
      await Promise.all(
        Array(this.MAX_POOL_SIZE)
          .fill(null)
          .map(() => this.createBrowser()),
      );
      this.startHealthCheck();
    } finally {
      this.initializing = false;
    }
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) return;
    this.healthCheckInterval = setInterval(() => this.pruneDeadBrowsers(), this.HEALTH_CHECK_INTERVAL_MS);
  }

  private async createBrowser(): Promise<Browser> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const pooled: PooledBrowser = {
      browser,
      inUse: false,
      lastUsed: Date.now(),
      jobCount: 0,
    };

    browser.on('disconnected', () => {
      const idx = this.pool.findIndex((p) => p.browser === browser);
      if (idx >= 0) {
        this.logger.warn(`Browser disconnected, removing from pool (pool size: ${this.pool.length - 1})`);
        this.pool.splice(idx, 1);
      }
    });

    this.pool.push(pooled);
    this.logger.log(`Browser created, pool size: ${this.pool.length}`);
    return browser;
  }

  private pruneDeadBrowsers(): void {
    const now = Date.now();
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const pooled = this.pool[i];
      if (!pooled.browser.connected) {
        this.logger.warn(`Removing dead browser from pool`);
        pooled.browser.close().catch(() => { });
        this.pool.splice(i, 1);
      } else if (!pooled.inUse && now - pooled.lastUsed > this.BROWSER_IDLE_TIMEOUT_MS && this.pool.length > 1) {
        this.logger.log(`Closing idle browser (idle for ${Math.round((now - pooled.lastUsed) / 1000)}s)`);
        pooled.browser.close().catch(() => { });
        this.pool.splice(i, 1);
      } else if (pooled.jobCount >= this.MAX_JOBS_PER_BROWSER && !pooled.inUse) {
        this.logger.log(`Recycling browser after ${pooled.jobCount} jobs`);
        pooled.browser.close().catch(() => { });
        this.pool.splice(i, 1);
      }
    }

    if (this.pool.length === 0) {
      this.logger.warn('Pool empty, creating new browser');
      this.createBrowser().catch((e) => this.logger.error(`Failed to create browser: ${e.message}`));
    }
  }

  private async shutdownPool(): Promise<void> {
    await Promise.all(
      this.pool.map(async (pooled) => {
        try {
          await pooled.browser.close();
        } catch {
          /* already closed */
        }
      }),
    );
    this.pool.length = 0;
  }

  private async acquireBrowser(): Promise<PooledBrowser> {
    for (const pooled of this.pool) {
      if (pooled.browser.connected && !pooled.inUse) {
        pooled.inUse = true;
        pooled.lastUsed = Date.now();
        return pooled;
      }
    }

    if (this.pool.length < this.MAX_POOL_SIZE) {
      const browser = await this.createBrowser();
      const pooled = this.pool.find((p) => p.browser === browser)!;
      pooled.inUse = true;
      pooled.lastUsed = Date.now();
      return pooled;
    }

    const start = Date.now();
    const timeout = 30_000;
    while (Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, 500));
      for (const pooled of this.pool) {
        if (pooled.browser.connected && !pooled.inUse) {
          pooled.inUse = true;
          pooled.lastUsed = Date.now();
          return pooled;
        }
      }
    }

    throw new Error('No available browsers in pool (timeout)');
  }

  private releaseBrowser(pooled: PooledBrowser): void {
    pooled.inUse = false;
    pooled.lastUsed = Date.now();
    pooled.jobCount += 1;
  }

  private async loadCompanyConfig(): Promise<void> {
    try {
      const config = await this.configuracionService.getAll();
      this.razonSocial = config['empresa_nombre'] ?? config['empresa_razon_social'] ?? 'IMPORT & EXPORT GOLD CONTINENT';
      this.ruc = config['empresa_ruc'] ?? '20523652525';
      this.direccion = config['empresa_direccion'] ?? '';
      this.telefono = config['empresa_telefono'] ?? '';
      this.email = config['empresa_email'] ?? '';
      this.bancoPrincipal = config['empresa_banco_principal'] ?? '';
      this.cuentaPrincipal = config['empresa_cuenta_principal'] ?? config['empresa_numero_cuenta'] ?? '';
      this.titularPrincipal = config['empresa_titular_principal'] ?? '';
      this.cciPrincipal = config['empresa_numero_interbanciero'] ?? '';
      this.bancoSecundario = config['empresa_banco_secundario'] ?? '';
      this.cuentaSecundaria = config['empresa_cuenta_secundaria'] ?? '';
      this.titularSecundaria = config['empresa_titular_secundaria'] ?? '';
      this.cciSecundaria = config['empresa_numero_interbanciero_secundario'] ?? '';
      this.terminosCondiciones = config['terminos_condiciones'] ?? '';
    } catch (e: any) {
      this.logger.warn(`Error al cargar configuración de empresa: ${e?.message ?? e}`);
    }
  }

  private buildHtml(cot: any): string {
    const cliente = cot.cliente || {};
    const detalle: any[] = Array.isArray(cot.detalle) ? cot.detalle : [];
    const numero = esc(cot.numero || `COT-${String(cot.id_cotizacion ?? '').padStart(3, '0')}`);
    const estadoRaw = String(cot.estado || 'borrador').toLowerCase();
    const estado = esc(estadoRaw.toUpperCase());
    const fecha = esc(fechaCorta(cot.created_at || cot.fecha));
    const fechaVencimiento = esc(fechaCorta(cot.fecha_vencimiento));

    const numDoc = String(cliente.ruc_dni || '');
    const tipoDocLabel = numDoc.length > 8 ? 'RUC:' : 'DNI:';

    const subtotal = detalle.reduce((acc, d) => acc + Number(d.precio_unitario ?? 0) * Number(d.cantidad ?? 0), 0);
    const costoCarreta = cot.incluye_carreta ? Number(cot.costo_carreta ?? 0) : 0;
    const igv = Number(cot.igv ?? (subtotal * 0.18));
    const total = Number(cot.total ?? (subtotal + igv + costoCarreta));

    const totalLineas = detalle.length;
    const totalUnidades = detalle.reduce((acc, d) => acc + Number(d.cantidad ?? 0), 0);

    const esCredito = cot.tipo_pago === 'credito' || (cliente.diasCreditoDefecto && Number(cliente.diasCreditoDefecto) > 0);
    const condicionPago = esCredito ? `CRÉDITO (${cliente.diasCreditoDefecto || 30} DÍAS)` : 'CONTADO';

    const estadoColors: Record<string, { bg: string; text: string; border: string }> = {
      borrador: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
      enviada: { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
      aprobada: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
      rechazada: { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
    };
    const statusStyle = estadoColors[estadoRaw] || estadoColors.borrador;

    const placeholderSvg = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="border-radius:4px;border:1px solid #e2e8f0;background:#f8fafc;display:inline-block;vertical-align:middle;"><rect width="36" height="36" rx="4" fill="#f8fafc"/><path d="M10 24L15 17L19 22L22 17L26 24H10Z" fill="#cbd5e1"/><circle cx="14" cy="13" r="2.5" fill="#cbd5e1"/></svg>`;

    const imageRows = detalle.map((d, i) => {
      const prod = d.producto || {};
      const imgUrl = prod.foto_url || prod.imagenUrl || prod.imagen_url;
      const hasValidImg = Boolean(imgUrl && (String(imgUrl).startsWith('http') || String(imgUrl).startsWith('data:image/')));
      const thumbHtml = hasValidImg
        ? `<img src="${esc(imgUrl)}" alt="img" style="width:36px;height:36px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;" />`
        : placeholderSvg;

      const codigo = esc(prod.codigo || d.codigo || '-');
      const descripcion = esc(String(prod.descripcion || d.descripcion || '-'));
      const colorNotas = d.color_notas ? esc(d.color_notas) : null;
      const precioUnit = Number(d.precio_unitario ?? 0);
      const cant = Number(d.cantidad ?? 0);
      const subtotalLinea = precioUnit * cant;
      const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';

      return `<tr style="background:${bg}">
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;width:50px">${thumbHtml}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f172a;font-size:11px">${codigo}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#334155">
              <div style="font-weight:600;font-size:11.5px;color:#1e293b">${descripcion}</div>
              ${colorNotas ? `<div style="font-size:10px;color:#64748b;margin-top:2px">Obs: ${colorNotas}</div>` : ''}
            </td>
            <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;color:#334155;font-size:11px">S/ ${money(precioUnit)}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;color:#0f172a;font-size:11px">${cant}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a;font-size:11.5px">S/ ${money(subtotalLinea)}</td>
          </tr>`;
    }).join('');

    const cuentasActivas = [];
    if (this.bancoPrincipal && this.cuentaPrincipal) {
      cuentasActivas.push({ banco: this.bancoPrincipal, numero: this.cuentaPrincipal, cci: this.cciPrincipal, titular: this.titularPrincipal });
    }
    if (this.bancoSecundario && this.cuentaSecundaria) {
      cuentasActivas.push({ banco: this.bancoSecundario, numero: this.cuentaSecundaria, cci: this.cciSecundaria, titular: this.titularSecundaria });
    }

    const terminosTexto = this.terminosCondiciones || `• Validez de la cotización: Establecido por el cliente.\n• Precios expresados en Soles (PEN) e incluyen IGV.\n• El stock está sujeto a disponibilidad al momento de confirmar el pedido.`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #0f172a; background: #ffffff; font-size: 11px; line-height: 1.4;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .page { padding: 30px 40px; }
    
    /* HEADER CORPORATIVO (Con el detalle amarillo) */
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #f8b602; padding-bottom: 15px; margin-bottom: 20px; }
    .header-left { max-width: 60%; }
    .brand-logo { height: 50px; max-width: 260px; object-fit: contain; display: block; margin-bottom: 8px; }
    .company-info { font-size: 9.5px; color: #475569; line-height: 1.4; }
    .company-info strong { color: #0f172a; }

    .header-right { text-align: right; min-width: 220px; }
    .doc-type { font-size: 10px; font-weight: 800; color: #f8b602; letter-spacing: 1.5px; text-transform: uppercase; }
    .doc-number { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; line-height: 1.1; margin-top: 4px; }
    .doc-details { margin-top: 8px; font-size: 10px; color: #475569; line-height: 1.5; }
    .status-badge { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; background: ${statusStyle.bg}; color: ${statusStyle.text}; border: 1px solid ${statusStyle.border}; }

    /* TARJETAS DE INFO */
    .info-grid { display: flex; gap: 15px; margin-bottom: 20px; }
    .info-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 15px; }
    .card-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #d97706; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .info-row { display: flex; font-size: 10px; margin-bottom: 4px; color: #334155; }
    .info-lbl { width: 85px; color: #64748b; font-weight: 600; flex-shrink: 0; }
    .info-val { font-weight: 600; color: #1e293b; }
    .pay-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9.5px; font-weight: 700; background: ${esCredito ? '#fef3c7' : '#dcfce7'}; color: ${esCredito ? '#92400e' : '#166534'}; }
    .client-name { font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 6px; line-height: 1.2; }

    /* TABLA DE PRODUCTOS */
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    thead th { background: #0f172a; color: #ffffff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px; }
    thead th:first-child { border-top-left-radius: 6px; }
    thead th:last-child { border-top-right-radius: 6px; }

    /* TOTALES */
    .totals-wrapper { display: flex; justify-content: flex-end; margin-top: 15px; }
    .totals-box { width: 280px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; color: #475569; }
    .totals-row.total-final { border-top: 1.5px solid #f8b602; margin-top: 8px; padding-top: 8px; font-size: 14px; font-weight: 800; color: #0f172a; background: #fefce8; margin-left: -15px; margin-right: -15px; margin-bottom: -15px; padding-left: 15px; padding-right: 15px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; }
    .total-amount { color: #d97706; font-size: 16px; }

    /* CUENTAS Y TÉRMINOS */
    .bottom-section { margin-top: 20px; display: flex; flex-direction: column; gap: 15px; page-break-inside: avoid; }
    .section-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 15px; }
    .section-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #d97706; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .bank-grid { display: flex; gap: 15px; flex-wrap: wrap; }
    .bank-card { flex: 1; min-width: 200px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-size: 10px; }
    .bank-name { font-weight: 800; font-size: 11px; color: #0284c7; margin-bottom: 4px; }
    .terms-text { font-size: 9.5px; color: #475569; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        ${this.logoBase64 ? `<img src="${this.logoBase64}" alt="Logo" class="brand-logo" />` : `<div style="font-size:24px;font-weight:800;color:#0f172a;">GOLD CONTINENT</div>`}
        <div class="company-info">
          <div><strong>${esc(this.razonSocial)}</strong></div>
          <div>RUC: ${esc(this.ruc)}</div>
          ${this.direccion ? `<div>${esc(this.direccion)}</div>` : ''}
          ${this.telefono ? `<div>Teléfono: ${esc(this.telefono)}</div>` : ''}
        </div>
      </div>
      <div class="header-right">
        <div class="doc-type">Cotización Comercial</div>
        <div class="doc-number">${numero}</div>
        <div class="doc-details">
          <div><strong>Emisión:</strong> ${fecha}</div>
        </div>
        <div><span class="status-badge">${estado}</span></div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="card-title">DATOS DEL CLIENTE</div>
        <div class="client-name">${esc(cliente.nombre || 'Cliente General')}</div>
        <div class="info-row"><span class="info-lbl">${tipoDocLabel}</span><span class="info-val">${esc(cliente.ruc_dni || '-')}</span></div>
        <div class="info-row"><span class="info-lbl">Teléfono:</span><span class="info-val">${esc(cliente.telefono || '-')}</span></div>
        <div class="info-row"><span class="info-lbl">Email:</span><span class="info-val">${esc(cliente.email || '-')}</span></div>
      </div>
      <div class="info-card">
        <div class="card-title">INFORMACIÓN DE VENTA</div>
        <div class="info-row"><span class="info-lbl">Ítems:</span><span class="info-val">${totalLineas} productos (${totalUnidades} und.)</span></div>
        <div class="info-row"><span class="info-lbl">Vencimiento:</span><span class="info-val">${fechaVencimiento}</span></div>
        <div class="info-row"><span class="info-lbl">Condición:</span><span class="info-val"><span class="pay-badge">${condicionPago}</span></span></div>
        ${cot.observaciones ? `<div class="info-row" style="margin-top:5px;"><span class="info-lbl">Observación:</span><span class="info-val" style="font-weight:400;font-size:9.5px;">${esc(cot.observaciones)}</span></div>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:50px;text-align:center;">FOTO</th>
          <th style="width:80px;text-align:left;">CÓDIGO</th>
          <th style="text-align:left;">DESCRIPCIÓN</th>
          <th style="width:80px;text-align:right;">P. UNIT</th>
          <th style="width:50px;text-align:center;">CANT</th>
          <th style="width:90px;text-align:right;">SUBTOTAL</th>
        </tr>
      </thead>
      <tbody>${imageRows}</tbody>
    </table>

    <div class="totals-wrapper">
      <div class="totals-box">
        <div class="totals-row"><span>Subtotal</span><span>S/ ${money(subtotal)}</span></div>
        <div class="totals-row"><span>IGV (18%)</span><span>S/ ${money(igv)}</span></div>
        ${costoCarreta > 0 ? `<div class="totals-row"><span>Servicio Carreta</span><span>S/ ${money(costoCarreta)}</span></div>` : ''}
        <div class="totals-row total-final"><span>TOTAL A PAGAR</span><span class="total-amount">S/ ${money(total)}</span></div>
      </div>
    </div>

    <div class="bottom-section">
      ${cuentasActivas.length > 0 ? `
      <div class="section-card">
        <div class="section-title">CUENTAS BANCARIAS</div>
        <div class="bank-grid">
          ${cuentasActivas.map(c => `<div class="bank-card"><div class="bank-name">${esc(c.banco)}</div><div>Cuenta: <strong>${esc(c.numero)}</strong></div>${c.cci ? `<div>CCI: ${esc(c.cci)}</div>` : ''}${c.titular ? `<div>Titular: ${esc(c.titular)}</div>` : ''}</div>`).join('')}
        </div>
      </div>` : ''}
      <div class="section-card">
        <div class="section-title">TÉRMINOS Y CONDICIONES</div>
        <div class="terms-text">${esc(terminosTexto).replace(/\n/g, '<br/>')}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  async generarPdfBuffer(
    id: number,
  ): Promise<{ buffer: Buffer; filename: string; hash: string }> {
    const cot: any = await this.cotizacionesService.obtenerPorId(id);
    if (!cot) throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
    const hash = computePdfHash(cot);

    await this.loadCompanyConfig().catch(() => { });
    if (!this.logoBase64) {
      this.loadLogo();
    }

    const pooled = await this.acquireBrowser();
    let page: import('puppeteer').Page | null = null;
    try {
      page = await pooled.browser.newPage();
      const html = this.buildHtml(cot);

      await page.setContent(html, { waitUntil: 'load', timeout: 20000 });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="width: 100%; font-size: 9px; color: #94a3b8; text-align: center; font-family: Helvetica, Arial, sans-serif; margin-top: 10px;">
            ${this.razonSocial} · RUC: ${this.ruc} · Página <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
        `,
      });

      const buffer = Buffer.from(pdf);
      const filename = `${String(cot.numero || `COT-${id}`).replace(/[^A-Za-z0-9-_]+/g, '_')}.pdf`;
      return { buffer, filename, hash };
    } finally {
      await page?.close().catch(() => undefined);
      this.releaseBrowser(pooled);
    }
  }
}