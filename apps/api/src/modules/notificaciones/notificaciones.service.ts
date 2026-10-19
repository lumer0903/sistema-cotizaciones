import { puede, UsuarioAutenticado } from '@goldcontinent/shared/auth/rbac';
import { alcanceDeDatos, verificarAlcance } from '../../common/utils/alcance.util';
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
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

/** Bandeja filtrada por permisos y propietario; las lecturas pertenecen a cada usuario. */
@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotificaciones(user: UsuarioAutenticado): Promise<NotificacionItem[]> {
    const cfg = await this.getFlags();
    const leidas = await this.getLeidasSet(user.id_usuario);

    const [stock, cotizaciones, cobranzas] = await Promise.all([
      cfg.stockBajo && puede(user, 'productos') ? this.getAlertasStock(leidas) : Promise.resolve([]),
      cfg.cotizacionesVencidas && puede(user, 'cotizaciones') ? this.getCotizacionesVencidas(leidas, alcanceDeDatos(user)) : Promise.resolve([]),
      cfg.cobranzasPendientes && puede(user, 'cobranza') ? this.getCobranzasPendientes(leidas, alcanceDeDatos(user)) : Promise.resolve([]),
    ]);

    return [...stock, ...cotizaciones, ...cobranzas].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async marcarTodosComoLeidos(user: UsuarioAutenticado): Promise<{ ok: true }> {
    const notificaciones = await this.getNotificaciones(user);
    const noLeidas = notificaciones.filter(n => !n.leida);
    
    for (const n of noLeidas) {
      if (n.tipo === 'STOCK_BAJO') {
        await this.reconocerAlertaStock(n.data.id_alerta as number, user);
      } else if (n.tipo === 'COTIZACION_VENCIDA' || n.tipo === 'COBRANZA_PENDIENTE') {
        await this.marcarLeida(n.tipo, n.data.id_cotizacion as number, user);
      }
    }
    
    return { ok: true };
  }

  /** Marca una alerta de stock como vista (reconocida, no resuelta). */
  async reconocerAlertaStock(idAlerta: number, user: UsuarioAutenticado): Promise<{ ok: true }> {
    if (!puede(user, 'productos')) throw new ForbiddenException();
    const alerta = await this.prisma.alertas_stock.findUnique({ where: { id_alerta: idAlerta } });
    if (!alerta) throw new NotFoundException('Alerta no encontrada');
    await this.guardarLectura('STOCK_BAJO', idAlerta, user.id_usuario);
    return { ok: true };
  }

  async marcarLeida(tipo: 'COTIZACION_VENCIDA' | 'COBRANZA_PENDIENTE', idReferencia: number, user: UsuarioAutenticado): Promise<{ ok: true }> {
    if (!puede(user, tipo === 'COTIZACION_VENCIDA' ? 'cotizaciones' : 'cobranza')) throw new ForbiddenException();
    const cot = await this.prisma.cotizacion.findUnique({ where: { id_cotizacion: idReferencia }, select: { id_usuario: true } });
    if (!cot) throw new NotFoundException('Cotización no encontrada');
    verificarAlcance(alcanceDeDatos(user), cot.id_usuario);
    await this.guardarLectura(tipo, idReferencia, user.id_usuario);
    return { ok: true };
  }

  private async guardarLectura(tipo: string, id_referencia: number, id_usuario: number) {
    await this.prisma.notificacionLectura.upsert({
      where: { id_usuario_tipo_id_referencia: { id_usuario, tipo, id_referencia } },
      create: { id_usuario, tipo, id_referencia }, update: {},
    });
  }

  private async getAlertasStock(leidas: Set<string>): Promise<NotificacionItem[]> {
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
      leida: leidas.has(this.claveLeida('STOCK_BAJO', a.id_alerta)),
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

  private async getCotizacionesVencidas(leidas: Set<string>, alcance: number | null): Promise<NotificacionItem[]> {
    const vencidas = await this.prisma.cotizacion.findMany({
      where: {
        ...(alcance === null ? {} : { id_usuario: alcance }),
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

  private async getCobranzasPendientes(leidas: Set<string>, alcance: number | null): Promise<NotificacionItem[]> {
    const hoy = new Date();
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + DIAS_PAGO_POR_VENCER);

    const pendientes = await this.prisma.cotizacion.findMany({
      where: {
        ...(alcance === null ? {} : { id_usuario: alcance }),
        estado: { in: ['enviada', 'parcialmente_pagada', 'aprobada'] },
        fecha_vencimiento: { lte: limite },
      },
      select: {
        id_cotizacion: true,
        numero: true,
        total: true,
        pagos: { select: { monto: true } },
        fecha_vencimiento: true,
        created_at: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: { fecha_vencimiento: 'asc' },
      take: 30,
    });

    return pendientes.filter(c => Number(c.total) > c.pagos.reduce((n, p) => n + Number(p.monto), 0)).map((c) => ({
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

  private async getLeidasSet(id_usuario: number): Promise<Set<string>> {
    const filas = await this.prisma.notificacionLectura.findMany({
      where: { id_usuario },
      select: { tipo: true, id_referencia: true },
    });
    return new Set(filas.map((f) => this.claveLeida(f.tipo, f.id_referencia)));
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
