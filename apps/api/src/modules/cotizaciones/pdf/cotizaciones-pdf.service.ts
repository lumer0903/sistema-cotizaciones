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
  ) {}

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
        pooled.browser.close().catch(() => {});
        this.pool.splice(i, 1);
      } else if (!pooled.inUse && now - pooled.lastUsed > this.BROWSER_IDLE_TIMEOUT_MS && this.pool.length > 1) {
        this.logger.log(`Closing idle browser (idle for ${Math.round((now - pooled.lastUsed) / 1000)}s)`);
        pooled.browser.close().catch(() => {});
        this.pool.splice(i, 1);
      } else if (pooled.jobCount >= this.MAX_JOBS_PER_BROWSER && !pooled.inUse) {
        this.logger.log(`Recycling browser after ${pooled.jobCount} jobs`);
        pooled.browser.close().catch(() => {});
        this.pool.splice(i, 1);
      }
    }

    // Ensure minimum pool size
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
    // Try to find an available browser
    for (const pooled of this.pool) {
      if (pooled.browser.connected && !pooled.inUse) {
        pooled.inUse = true;
        pooled.lastUsed = Date.now();
        return pooled;
      }
    }

    // Create new browser if under limit
    if (this.pool.length < this.MAX_POOL_SIZE) {
      const browser = await this.createBrowser();
      const pooled = this.pool.find((p) => p.browser === browser)!;
      pooled.inUse = true;
      pooled.lastUsed = Date.now();
      return pooled;
    }

    // Wait for a browser to become available (with timeout)
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

    const tipoPrecioMap: Record<string, string> = {
      normal: 'NORMAL',
      mayor: 'POR MAYOR',
      docena: 'POR DOCENA',
      distribuidor: 'DISTRIBUIDOR',
    };
    const tipoPrecioRaw = String(cot.tipo_precio || 'normal').toLowerCase();
    const tipoPrecio = esc(tipoPrecioMap[tipoPrecioRaw] || tipoPrecioRaw.toUpperCase());

    const subtotal = detalle.reduce(
      (acc, d) => acc + Number(d.precio_unitario ?? 0) * Number(d.cantidad ?? 0),
      0,
    );
    const costoCarreta = cot.incluye_carreta ? Number(cot.costo_carreta ?? 0) : 0;
    const total = Number(cot.total ?? (subtotal + costoCarreta));

    const totalLineas = detalle.length;
    const totalUnidades = detalle.reduce((acc, d) => acc + Number(d.cantidad ?? 0), 0);

    const esCredito = cot.tipo_pago === 'credito' ||
      (cliente.diasCreditoDefecto && Number(cliente.diasCreditoDefecto) > 0) ||
      /cr[eé]dito/i.test(String(cot.observaciones || ''));
    const condicionPago = esCredito
      ? `CRÉDITO${cliente.diasCreditoDefecto ? ` (${cliente.diasCreditoDefecto} DÍAS)` : ''}`
      : 'CONTADO';

    const estadoColors: Record<string, { bg: string; text: string; border: string }> = {
      borrador: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
      enviada: { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
      enviado: { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
      aprobada: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
      parcialmente_pagada: { bg: '#fffbeb', text: '#b45309', border: '#fcd34d' },
      convertida_a_venta: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
      rechazada: { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
      expirada: { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
    };
    const statusStyle = estadoColors[estadoRaw] || estadoColors.borrador;

    const placeholderSvg = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="border-radius:4px;border:1px solid #e2e8f0;background:#f8fafc;display:inline-block;vertical-align:middle;">
      <rect width="36" height="36" rx="4" fill="#f8fafc"/>
      <path d="M10 24L15 17L19 22L22 17L26 24H10Z" fill="#cbd5e1"/>
      <circle cx="14" cy="13" r="2.5" fill="#cbd5e1"/>
    </svg>`;

    const imageRows = detalle
      .map((d, i) => {
        const prod = d.producto || {};
        const imgUrl = prod.foto_url || prod.imagenUrl || prod.imagen_url;
        const hasValidImg = Boolean(
          imgUrl &&
          (String(imgUrl).startsWith('http://') ||
           String(imgUrl).startsWith('https://') ||
           String(imgUrl).startsWith('data:image/'))
        );
        const thumbHtml = hasValidImg
          ? `<img src="${esc(imgUrl)}" alt="${esc(prod.codigo || '')}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;display:inline-block;vertical-align:middle;background:#f8fafc;" onerror="this.style.display='none'"/>`
          : placeholderSvg;

        const codigo = esc(prod.codigo || d.codigo || '-');
        const descripcion = esc(String(prod.descripcion || d.descripcion || '-'));
        const colorNotas = d.color_notas ? esc(d.color_notas) : null;
        const precioUnit = Number(d.precio_unitario ?? 0);
        const cant = Number(d.cantidad ?? 0);
        const subtotalLinea = precioUnit * cant;
        const bg = i % 2 === 0 ? '#ffffff' : '#fcfcfd';

        return `<tr style="background:${bg}">
            <td style="padding:6px 6px;border-bottom:1px solid #f1f5f9;text-align:center;width:44px">${thumbHtml}</td>
            <td style="padding:8px 8px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#0f172a;font-size:11px">${codigo}</td>
            <td style="padding:8px 8px;border-bottom:1px solid #f1f5f9;color:#334155">
              <div style="font-weight:600;font-size:11.5px;color:#1e293b">${descripcion}</div>
              ${colorNotas ? `<div style="font-size:10px;color:#64748b;margin-top:2px">Nota: ${colorNotas}</div>` : ''}
            </td>
            <td style="padding:8px 8px;border-bottom:1px solid #f1f5f9;text-align:right;color:#334155;font-size:11px">S/ ${money(precioUnit)}</td>
            <td style="padding:8px 8px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#0f172a;font-size:11px">${cant}</td>
            <td style="padding:8px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f172a;font-size:11.5px">S/ ${money(subtotalLinea)}</td>
          </tr>`;
      })
      .join('');

    const cuentasActivas: Array<{ banco: string; numero: string; cci?: string; titular?: string }> = [];
    if (this.bancoPrincipal && this.cuentaPrincipal) {
      cuentasActivas.push({
        banco: this.bancoPrincipal,
        numero: this.cuentaPrincipal,
        cci: this.cciPrincipal,
        titular: this.titularPrincipal,
      });
    }
    if (this.bancoSecundario && this.cuentaSecundaria) {
      cuentasActivas.push({
        banco: this.bancoSecundario,
        numero: this.cuentaSecundaria,
        cci: this.cciSecundaria,
        titular: this.titularSecundaria || this.titularPrincipal,
      });
    }

    const terminosTexto = this.terminosCondiciones || `• Validez de la cotización: 30 días calendario a partir de la fecha de emisión o hasta la fecha de vencimiento indicada.
• Precios expresados en Soles (PEN) e incluyen IGV.
• El stock de los productos está sujeto a disponibilidad al momento de confirmar el pedido y validar el pago.
• Los despachos se programan una vez confirmado el pago completo o según las condiciones de crédito autorizadas.
• Pasada la fecha de vencimiento, la cotización no tiene validez y los precios quedan sujetos a reconfirmación.`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Cotización ${numero}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { padding: 24px 28px; }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #f8b602;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .header-left { max-width: 58%; }
    .brand-logo {
      height: 44px;
      max-width: 250px;
      object-fit: contain;
      display: block;
      margin-bottom: 6px;
    }
    .brand-fallback {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.3px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .brand-fallback span { color: #f8b602; }
    .company-info {
      font-size: 9.5px;
      color: #475569;
      line-height: 1.35;
    }
    .company-info strong { color: #1e293b; }

    .header-right {
      text-align: right;
      min-width: 200px;
    }
    .doc-type {
      font-size: 10px;
      font-weight: 800;
      color: #f8b602;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .doc-number {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .doc-details {
      margin-top: 6px;
      font-size: 10px;
      color: #475569;
      line-height: 1.4;
    }
    .rate-badge {
      display: inline-block;
      font-weight: 700;
      color: #0f172a;
      background: #f1f5f9;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 9.5px;
    }
    .status-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background: ${statusStyle.bg};
      color: ${statusStyle.text};
      border: 1px solid ${statusStyle.border};
    }

    /* Info Grid (Tarjetas Cliente y Resumen) */
    .info-grid {
      display: flex;
      gap: 14px;
      margin-bottom: 16px;
    }
    .info-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .card-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .client-name {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .info-row {
      display: flex;
      font-size: 10px;
      margin-bottom: 2px;
      color: #334155;
    }
    .info-lbl {
      width: 85px;
      color: #64748b;
      flex-shrink: 0;
    }
    .info-val {
      font-weight: 600;
      color: #1e293b;
      word-break: break-word;
    }
    .pay-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      background: ${esCredito ? '#e0f2fe' : '#dcfce7'};
      color: ${esCredito ? '#0369a1' : '#15803d'};
      border: 1px solid ${esCredito ? '#bae6fd' : '#bbf7d0'};
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    thead th {
      background: #0f172a;
      color: #ffffff;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 7px 8px;
    }
    thead th:first-child { border-top-left-radius: 6px; }
    thead th:last-child { border-top-right-radius: 6px; }
    tbody tr { page-break-inside: avoid; }

    /* Totals */
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
    }
    .totals-box {
      width: 260px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 11px;
      color: #475569;
    }
    .totals-row.total-final {
      border-top: 1.5px solid #f8b602;
      margin-top: 4px;
      padding-top: 6px;
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      background: #fefce8;
      margin-left: -12px;
      margin-right: -12px;
      margin-bottom: -8px;
      padding-left: 12px;
      padding-right: 12px;
      padding-bottom: 8px;
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
    }
    .total-amount {
      color: #d97706;
      font-size: 15px;
    }

    /* Bank Accounts & Terms */
    .bottom-section {
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      page-break-inside: avoid;
    }
    .section-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 9px 12px;
    }
    .section-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      margin-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
    }
    .bank-grid {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .bank-card {
      flex: 1;
      min-width: 220px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 10px;
    }
    .bank-name {
      font-weight: 700;
      font-size: 11px;
      margin-bottom: 2px;
      color: #0284c7;
    }
    .bank-line {
      margin: 1.5px 0;
      color: #334155;
    }
    .bank-lbl {
      color: #64748b;
      font-size: 9.5px;
      display: inline-block;
      width: 65px;
    }
    .terms-text {
      font-size: 9.5px;
      color: #475569;
      line-height: 1.45;
    }

    /* Footer */
    .page-footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-size: 8.5px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        ${this.logoBase64
          ? `<img src="${this.logoBase64}" alt="${esc(this.razonSocial)}" class="brand-logo" />`
          : `<div class="brand-fallback">IMPORT & EXPORT <span>GOLD CONTINENT</span></div>`}
        <div class="company-info">
          <div><strong>${esc(this.razonSocial)}</strong></div>
          ${this.ruc ? `<div><strong>RUC:</strong> ${esc(this.ruc)}</div>` : ''}
          ${this.direccion ? `<div>${esc(this.direccion)}</div>` : ''}
          ${(this.telefono || this.email) ? `<div>${[this.telefono ? `Tel: ${esc(this.telefono)}` : '', this.email ? `Email: ${esc(this.email)}` : ''].filter(Boolean).join(' · ')}</div>` : ''}
        </div>
      </div>
      <div class="header-right">
        <div class="doc-type">Cotización Comercial</div>
        <div class="doc-number">${numero}</div>
        <div class="doc-details">
          <div><strong>Fecha Emisión:</strong> ${fecha}</div>
          <div><strong>Tarifa:</strong> <span class="rate-badge">${tipoPrecio}</span></div>
        </div>
        <div>
          <span class="status-badge">${estado}</span>
        </div>
      </div>
    </div>

    <!-- Info Cards (Cliente y Resumen) -->
    <div class="info-grid">
      <div class="info-card">
        <div class="card-title">DATOS DEL CLIENTE</div>
        <div class="client-name">${esc(cliente.nombre || 'Cliente General')}</div>
        <div class="info-row">
          <span class="info-lbl">DNI / RUC:</span>
          <span class="info-val">${esc(cliente.ruc_dni || '-')}</span>
        </div>
        <div class="info-row">
          <span class="info-lbl">Teléfono:</span>
          <span class="info-val">${esc(cliente.telefono || '-')}</span>
        </div>
        <div class="info-row">
          <span class="info-lbl">Email:</span>
          <span class="info-val">${esc(cliente.email || '-')}</span>
        </div>
      </div>

      <div class="info-card">
        <div class="card-title">RESUMEN DE LA COTIZACIÓN</div>
        <div class="info-row">
          <span class="info-lbl">Total Ítems:</span>
          <span class="info-val"><strong>${totalLineas} productos (${totalUnidades} und.)</strong></span>
        </div>
        <div class="info-row">
          <span class="info-lbl">Vencimiento:</span>
          <span class="info-val"><strong>${fechaVencimiento}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-lbl">Condición Pago:</span>
          <span class="info-val"><span class="pay-badge">${condicionPago}</span></span>
        </div>
        ${cot.observaciones ? `
        <div class="info-row">
          <span class="info-lbl">Observaciones:</span>
          <span class="info-val">${esc(cot.observaciones)}</span>
        </div>` : ''}
      </div>
    </div>

    <!-- Tabla de Productos -->
    <table>
      <thead>
        <tr>
          <th style="width:44px;text-align:center;">FOTO</th>
          <th style="width:75px;text-align:left;">CÓDIGO</th>
          <th style="text-align:left;">DESCRIPCIÓN</th>
          <th style="width:80px;text-align:right;">PRECIO</th>
          <th style="width:45px;text-align:center;">CANT</th>
          <th style="width:85px;text-align:right;">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${imageRows || '<tr><td colspan="6" style="padding:18px;text-align:center;color:#94a3b8">No se registraron productos en esta cotización.</td></tr>'}
      </tbody>
    </table>

    <!-- Totales -->
    <div class="totals-wrapper">
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal</span>
          <span><strong>S/ ${money(subtotal)}</strong></span>
        </div>
        ${costoCarreta > 0 ? `
        <div class="totals-row">
          <span>Servicio Carreta</span>
          <span><strong>S/ ${money(costoCarreta)}</strong></span>
        </div>` : ''}
        <div class="totals-row total-final">
          <span>TOTAL A PAGAR</span>
          <span class="total-amount">S/ ${money(total)}</span>
        </div>
      </div>
    </div>

    <!-- Sección Inferior: Cuentas y Términos -->
    <div class="bottom-section">
      ${cuentasActivas.length > 0 ? `
      <div class="section-card">
        <div class="section-title">CUENTAS BANCARIAS PARA DEPÓSITO O TRANSFERENCIA</div>
        <div class="bank-grid">
          ${cuentasActivas.map(c => `
            <div class="bank-card">
              <div class="bank-name">${esc(c.banco)}</div>
              <div class="bank-line"><span class="bank-lbl">N° Cuenta:</span> <strong>${esc(c.numero)}</strong></div>
              ${c.cci ? `<div class="bank-line"><span class="bank-lbl">CCI:</span> ${esc(c.cci)}</div>` : ''}
              ${c.titular ? `<div class="bank-line"><span class="bank-lbl">Titular:</span> ${esc(c.titular)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <div class="section-card">
        <div class="section-title">TÉRMINOS Y CONDICIONES</div>
        <div class="terms-text">
          ${esc(terminosTexto).replace(/\n/g, '<br/>')}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="page-footer">
      Documento generado por <strong>${esc(this.razonSocial)}</strong> · RUC: ${esc(this.ruc)} · Lima, Perú
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

    // Actualizar configuración dinámica para reflejar cambios recientes de la BD
    await this.loadCompanyConfig().catch(() => {});
    if (!this.logoBase64) {
      this.loadLogo();
    }

    const pooled = await this.acquireBrowser();
    let page: import('puppeteer').Page | null = null;
    try {
      page = await pooled.browser.newPage();
      const html = this.buildHtml(cot);
      await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
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