import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export type TipoNotificacion =
  | 'STOCK_BAJO'
  | 'COTIZACION_VENCIDA'
  | 'COBRANZA_PENDIENTE';

export interface NotificacionItem {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  leida: boolean;
  createdAt: string;
  data: Record<string, unknown>;
}

interface ConfigNotificaciones {
  stockBajo: boolean;
  cotizacionesVencidas: boolean;
  cobranzasPendientes: boolean;
}

/** Días de anticipación para avisar que un pago está por vencer. */
const DIAS_PAGO_POR_VENCER = 3;

/** Máximo de notificaciones leídas que se conservan como historial por tipo. */
const HISTORIAL_MAX_POR_TIPO = 10;

/**
 * Notificaciones de la bandeja (campana del navbar).
 *
 * Una notificación vista se marca como "leída" pero NO se elimina: queda en la
 * bandeja como historial (máx. HISTORIAL_MAX_POR_TIPO por tipo).
 *
 * - STOCK_BAJO: alertas de `alertas_stock` con estado 'activa' (no vistas) o
 *   'reconocida' (vistas). Al hacer clic se pasa a 'reconocida'.
 * - COTIZACION_VENCIDA / COBRANZA_PENDIENTE: se derivan de `cotizaciones`; el
 *   estado "vista" se persiste en la tabla `notificaciones_leidas`.
 */
@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotificaciones(): Promise<NotificacionItem[]> {
    const cfg = await this.getFlags();
    const leidas = await this.getLeidasSet();

    const [stock, cotizaciones, cobranzas] = await Promise.all([
      cfg.stockBajo ? this.getAlertasStock() : Promise.resolve([]),
      cfg.cotizacionesVencidas ? this.getCotizacionesVencidas(leidas) : Promise.resolve([]),
      cfg.cobranzasPendientes ? this.getCobranzasPendientes(leidas) : Promise.resolve([]),
    ]);

    return [...stock, ...cotizaciones, ...cobranzas].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async marcarTodosComoLeidos(): Promise<{ ok: true }> {
    const notificaciones = await this.getNotificaciones();
    const noLeidas = notificaciones.filter(n => !n.leida);
    
    for (const n of noLeidas) {
      if (n.tipo === 'STOCK_BAJO') {
        await this.reconocerAlertaStock(n.data.id_alerta as number);
      } else if (n.tipo === 'COTIZACION_VENCIDA' || n.tipo === 'COBRANZA_PENDIENTE') {
        await this.marcarLeida(n.tipo, n.data.id_cotizacion as number);
      }
    }
    
    return { ok: true };
  }

  /** Marca una alerta de stock como vista (reconocida, no resuelta). */
  async reconocerAlertaStock(idAlerta: number): Promise<{ ok: true }> {
    await this.prisma.alertas_stock.update({
      where: { id_alerta: idAlerta },
      data: { estado: 'reconocida', reconocida_at: new Date() },
    });
    return { ok: true };
  }

  /** Marca una notificación de cotización/cobranza como vista. */
  async marcarLeida(tipo: 'COTIZACION_VENCIDA' | 'COBRANZA_PENDIENTE', idReferencia: number): Promise<{ ok: true }> {
    await this.prisma.notificaciones_leidas.upsert({
      where: { tipo_id_referencia: { tipo, id_referencia: idReferencia } },
      create: { tipo, id_referencia: idReferencia },
      update: {},
    });
    await this.podarHistorial(tipo);
    return { ok: true };
  }

  private async getAlertasStock(): Promise<NotificacionItem[]> {
    const alertas = await this.prisma.alertas_stock.findMany({
      where: { estado: { in: ['activa', 'reconocida'] } },
      select: {
        id_alerta: true,
        id_producto: true,
        stock_actual: true,
        stock_minimo: true,
        estado: true,
        created_at: true,
        productos: { select: { codigo: true, descripcion: true } },
        almacenes: { select: { nombre: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 30,
    });

    return alertas.map((a) => ({
      id: `stock_${a.id_alerta}`,
      tipo: 'STOCK_BAJO' as const,
      titulo: 'Stock bajo',
      leida: a.estado === 'reconocida',
      createdAt: a.created_at.toISOString(),
      data: {
        id_alerta: a.id_alerta,
        id_producto: a.id_producto,
        stock_actual: a.stock_actual,
        stock_minimo: a.stock_minimo,
        codigo: a.productos.codigo,
        descripcion: a.productos.descripcion,
        almacen: a.almacenes.nombre,
      },
    }));
  }

  private async getCotizacionesVencidas(leidas: Set<string>): Promise<NotificacionItem[]> {
    const vencidas = await this.prisma.cotizacion.findMany({
      where: {
        estado: 'enviada',
        fecha_vencimiento: { lt: new Date() },
      },
      select: {
        id_cotizacion: true,
        numero: true,
        total: true,
        fecha_vencimiento: true,
        created_at: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: { fecha_vencimiento: 'asc' },
      take: 30,
    });

    return vencidas.map((c) => ({
      id: `cot_vencida_${c.id_cotizacion}`,
      tipo: 'COTIZACION_VENCIDA' as const,
      titulo: 'Cotización vencida',
      leida: leidas.has(this.claveLeida('COTIZACION_VENCIDA', c.id_cotizacion)),
      createdAt: (c.fecha_vencimiento ?? c.created_at).toISOString(),
      data: {
        id_cotizacion: c.id_cotizacion,
        numero: c.numero,
        total: c.total,
        fecha_vencimiento: c.fecha_vencimiento?.toISOString() ?? null,
        cliente: c.cliente?.nombre ?? 'Cliente',
      },
    }));
  }

  private async getCobranzasPendientes(leidas: Set<string>): Promise<NotificacionItem[]> {
    const hoy = new Date();
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + DIAS_PAGO_POR_VENCER);

    const pendientes = await this.prisma.cotizacion.findMany({
      where: {
        estado: { in: ['enviada', 'parcialmente_pagada'] },
        fecha_vencimiento: { lte: limite },
      },
      select: {
        id_cotizacion: true,
        numero: true,
        total: true,
        fecha_vencimiento: true,
        created_at: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: { fecha_vencimiento: 'asc' },
      take: 30,
    });

    return pendientes.map((c) => ({
      id: `cobranza_${c.id_cotizacion}`,
      tipo: 'COBRANZA_PENDIENTE' as const,
      titulo: 'Cobranza por vencer',
      leida: leidas.has(this.claveLeida('COBRANZA_PENDIENTE', c.id_cotizacion)),
      createdAt: (c.fecha_vencimiento ?? c.created_at).toISOString(),
      data: {
        id_cotizacion: c.id_cotizacion,
        numero: c.numero,
        total: c.total,
        fecha_vencimiento: c.fecha_vencimiento?.toISOString() ?? null,
        cliente: c.cliente?.nombre ?? 'Cliente',
      },
    }));
  }

  private claveLeida(tipo: string, id: number): string {
    return `${tipo}:${id}`;
  }

  private async getLeidasSet(): Promise<Set<string>> {
    const filas = await this.prisma.notificaciones_leidas.findMany({
      select: { tipo: true, id_referencia: true },
    });
    return new Set(filas.map((f) => this.claveLeida(f.tipo, f.id_referencia)));
  }

  /** Conserva solo las HISTORIAL_MAX_POR_TIPO leídas más recientes por tipo. */
  private async podarHistorial(tipo: string): Promise<void> {
    const recientes = await this.prisma.notificaciones_leidas.findMany({
      where: { tipo },
      orderBy: { leida_en: 'desc' },
      take: HISTORIAL_MAX_POR_TIPO,
      select: { id: true },
    });
    const idsConservar = recientes.map((r) => r.id);
    await this.prisma.notificaciones_leidas.deleteMany({
      where: { tipo, id: { notIn: idsConservar } },
    });
  }

  private async getFlags(): Promise<ConfigNotificaciones> {
    const claves = [
      'notificaciones_stock_bajo',
      'notificaciones_cotizaciones_vencidas',
      'notificaciones_cobranzas_pendientes',
    ];
    const filas = await this.prisma.configuracion.findMany({
      where: { clave: { in: claves } },
      select: { clave: true, valor: true },
    });
    const mapa = new Map(filas.map((f) => [f.clave, f.valor]));

    return {
      stockBajo: mapa.get('notificaciones_stock_bajo') !== 'false',
      cotizacionesVencidas: mapa.get('notificaciones_cotizaciones_vencidas') !== 'false',
      cobranzasPendientes: mapa.get('notificaciones_cobranzas_pendientes') !== 'false',
    };
  }
}
