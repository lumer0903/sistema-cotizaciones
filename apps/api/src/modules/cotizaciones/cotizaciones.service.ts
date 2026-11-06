import { registrarPagoSeguro } from '../../common/utils/pagos.util';
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { ListarCotizacionesQueryDto } from './dto/listar-cotizaciones.query.dto';
import { EstadoCotizacion } from '@goldcontinent/shared/constants/enums';
import { verificarAlcance } from '../../common/utils/alcance.util';

@Injectable()
export class CotizacionesService {
    private readonly IGV_RATE = 0.18;
    private readonly DEFAULT_ALMACEN_ID = 1;

    constructor(private readonly prisma: PrismaService) { }

    private calcularTotales(subtotal: number, incluyeCarreta: boolean, costoCarreta: number) {
        const igv = Math.round(subtotal * this.IGV_RATE * 100) / 100;
        const total = subtotal + igv + (incluyeCarreta ? costoCarreta : 0);
        return { subtotal, igv, total };
    }

    async crear(data: CreateCotizacionDto, idUsuario: number) {
        const {
            id_cliente,
            tipo_precio = 'normal',
            observaciones,
            incluye_carreta = false,
            costo_carreta = 0,
            detalle = [],
            fecha_vencimiento = null,
        } = data;

        if (!id_cliente) {
            throw new BadRequestException('El campo id_cliente es obligatorio');
        }

        if (!Array.isArray(detalle) || detalle.length === 0) {
            throw new BadRequestException('La cotización debe incluir al menos un producto en el detalle');
        }

        const detalleInvalido = !detalle.every((it) =>
            Number(it.id_producto) > 0 && Number(it.cantidad) > 0 && Number(it.precio_unitario) >= 0,
        );
        if (detalleInvalido) {
            throw new BadRequestException(
                'Cada línea del detalle requiere un producto válido, cantidad mayor a 0 y precio_unitario mayor o igual a 0',
            );
        }

        const userIdParsed = Number(idUsuario);
        const id_usuario = !isNaN(userIdParsed) && userIdParsed > 0 ? userIdParsed : null;

        const subtotal = detalle.reduce(
            (acc, item) => acc + Number(item.cantidad) * Number(item.precio_unitario),
            0,
        );
        const carreta = incluye_carreta ? Number(costo_carreta) : 0;
        const { igv, total } = this.calcularTotales(subtotal, incluye_carreta, carreta);

        try {
            return await this.prisma.$transaction(async (tx) => {
                await tx.$queryRaw`SELECT pg_advisory_xact_lock(718222)::text`;
                const numero = await this.generarNumeroSecuencial(tx);
                const cotizacion = await tx.cotizacion.create({
                    data: {
                        numero,
                        id_cliente: Number(id_cliente),
                        id_usuario,
                        estado: 'borrador' as any,
                        tipo_precio: tipo_precio as any,
                        observaciones,
                        incluye_carreta: Boolean(incluye_carreta),
                        costo_carreta: carreta,
                        subtotal,
                        igv,
                        total,
                        fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : null,
                        detalle: {
                            create: detalle.map((item) => ({
                                id_producto: Number(item.id_producto),
                                tipo_venta: item.tipo_venta as any,
                                cantidad: Number(item.cantidad),
                                precio_unitario: Number(item.precio_unitario),
                                subtotal: Number(item.cantidad) * Number(item.precio_unitario),
                                color_notas: item.color_notas || null,
                                es_sugerido_ia: Boolean(item.es_sugerido_ia),
                            })),
                        },
                    },
                    include: {
                        detalle: true,
                        cliente: true,
                    },
                });

                return cotizacion;
            });
        } catch (error: any) {
            if (error.code === 'P2003') {
                throw new BadRequestException(
                    'Error de relación: Verifique que el id_cliente, id_usuario o id_producto existan en la base de datos.',
                );
            }
            if (error.code === 'P2002') {
                throw new BadRequestException('El número correlativo de la cotización ya existe.');
            }
            throw new BadRequestException(`Fallo en la creación: ${error.message || error}`);
        }
    }

    async listar(query: ListarCotizacionesQueryDto, alcance: number | null = null) {
        const page = Math.max(Number(query.page) || 1, 1);
        const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 1000);
        const skip = (page - 1) * limit;

        const ESTADOS_VALIDOS: EstadoCotizacion[] = [
            'borrador',
            'enviada',
            'parcialmente_pagada',
            'aprobada',
            'rechazada',
            'expirada',
            'convertida_a_venta',
        ];

        const where: Prisma.CotizacionWhereInput = {};
        if (alcance !== null) where.id_usuario = alcance;
        if (query.estado) {
            const estado = String(query.estado).trim().toLowerCase() as EstadoCotizacion;
            if (ESTADOS_VALIDOS.includes(estado)) where.estado = estado;
        }
        if (query.id_cliente) where.id_cliente = Number(query.id_cliente);

        const buscar = String(query.buscar ?? '').trim().slice(0, 100);
        if (buscar) {
            where.OR = [
                { numero: { contains: buscar, mode: 'insensitive' } },
                { cliente: { nombre: { contains: buscar, mode: 'insensitive' } } },
                { cliente: { ruc_dni: { contains: buscar, mode: 'insensitive' } } },
            ];
        }

        const fecha = String(query.fecha ?? '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            where.created_at = {
                gte: new Date(`${fecha}T00:00:00`),
                lte: new Date(`${fecha}T23:59:59.999`),
            };
        }

        const [total, data] = await Promise.all([
            this.prisma.cotizacion.count({ where }),
            this.prisma.cotizacion.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    cliente: true,
                    usuario: { select: { id_usuario: true, nombre: true } },
                },
            }),
        ]);

        return {
            data,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
    }

    async obtenerPorId(id: number, alcance: number | null = null, client: Prisma.TransactionClient | PrismaService = this.prisma) {
        const cotizacion = await client.cotizacion.findUnique({
            where: { id_cotizacion: id },
            include: {
                detalle: {
                    include: { producto: true },
                },
                cliente: true,
                usuario: { select: { id_usuario: true, nombre: true } },
                pagos: true,
            },
        });

        if (!cotizacion) {
            throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
        }

        verificarAlcance(
            alcance,
            cotizacion.id_usuario,
            `Cotización con ID ${id} no encontrada`,
            'No tienes permiso sobre esta cotización',
        );

        return cotizacion;
    }

    async asegurarAcceso(id: number, alcance: number | null = null): Promise<void> {
        if (alcance === null) return;
        const row = await this.prisma.cotizacion.findUnique({
            where: { id_cotizacion: id },
            select: { id_usuario: true },
        });
        if (!row) throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
        if (row.id_usuario == null || Number(row.id_usuario) !== alcance) {
            throw new ForbiddenException('No tienes permiso sobre esta cotización');
        }
    }

    async generarNumeroSecuencial(client: Pick<Prisma.TransactionClient, '$queryRaw'> = this.prisma): Promise<string> {
        const rows = await client.$queryRaw<Array<{ maximo: string }>>`
          SELECT COALESCE(MAX(SUBSTRING(numero FROM 5)::numeric), 0)::text AS maximo
          FROM cotizaciones WHERE numero ~ '^COT-[0-9]{1,9}$'
        `;
        return 'COT-' + String(BigInt(rows[0]?.maximo ?? '0') + 1n).padStart(3, '0');
    }

    async proximoNumero(): Promise<{ numero: string }> {
        return { numero: await this.generarNumeroSecuencial() };
    }

    async actualizar(id: number, data: UpdateCotizacionDto, alcance: number | null = null) {
        return this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id_cotizacion FROM cotizaciones WHERE id_cotizacion = ${id} FOR UPDATE`;
            const actual = await this.obtenerPorId(id, alcance, tx);

            if (actual.estado !== 'borrador') {
                throw new BadRequestException(
                    `Solo se puede editar una cotización en estado BORRADOR (actual: ${actual.estado})`,
                );
            }

            const {
                id_cliente,
                tipo_precio,
                observaciones,
                incluye_carreta,
                costo_carreta,
                detalle,
                fecha_vencimiento,
            } = data;

            if (detalle !== undefined && (!Array.isArray(detalle) || detalle.length === 0)) {
                throw new BadRequestException('La cotización debe incluir al menos un producto en el detalle');
            }

            if (Array.isArray(detalle)) {
                const detalleInvalido = !detalle.every((it) =>
                    Number(it.id_producto) > 0 && Number(it.cantidad) > 0 && Number(it.precio_unitario) >= 0,
                );
                if (detalleInvalido) {
                    throw new BadRequestException(
                        'Cada línea del detalle requiere un producto válido, cantidad mayor a 0 y precio_unitario mayor o igual a 0',
                    );
                }
            }

            const lineas = Array.isArray(detalle) ? detalle : null;
            const subtotal = lineas
                ? lineas.reduce(
                    (acc, item) => acc + Number(item.cantidad) * Number(item.precio_unitario),
                    0,
                )
                : Number(actual.subtotal);
            const incluyeCarreta = incluye_carreta ?? actual.incluye_carreta;
            const carreta = incluyeCarreta ? Number(costo_carreta ?? actual.costo_carreta ?? 0) : 0;
            const { igv, total } = this.calcularTotales(subtotal, incluyeCarreta, carreta);

            try {
                return await tx.cotizacion.update({
                    where: { id_cotizacion: id },
                    data: {
                        ...(id_cliente !== undefined ? { id_cliente: Number(id_cliente) } : {}),
                        ...(tipo_precio !== undefined ? { tipo_precio: tipo_precio as any } : {}),
                        ...(observaciones !== undefined ? { observaciones } : {}),
                        ...(incluye_carreta !== undefined ? { incluye_carreta: Boolean(incluye_carreta) } : {}),
                        costo_carreta: carreta,
                        ...(fecha_vencimiento !== undefined
                            ? { fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : null }
                            : {}),
                        subtotal,
                        igv,
                        total,
                        ...(lineas
                            ? {
                                detalle: {
                                    deleteMany: {},
                                    create: lineas.map((item) => ({
                                        id_producto: Number(item.id_producto),
                                        tipo_venta: item.tipo_venta as any,
                                        cantidad: Number(item.cantidad),
                                        precio_unitario: Number(item.precio_unitario),
                                        subtotal: Number(item.cantidad) * Number(item.precio_unitario),
                                        color_notas: item.color_notas || null,
                                        es_sugerido_ia: Boolean(item.es_sugerido_ia),
                                    })),
                                },
                            }
                            : {}),
                    },
                    include: {
                        detalle: true,
                        cliente: true,
                    },
                });
            } catch (error: any) {
                if (error instanceof BadRequestException) throw error;
                if (error.code === 'P2003') {
                    throw new BadRequestException(
                        'Error de relación: Verifique que el id_cliente o id_producto existan en la base de datos.',
                    );
                }
                throw new BadRequestException(`Fallo en la actualización: ${error.message || error}`);
            }
        });
    }

    async cambiarEstado(id: number, estado: string, alcance: number | null = null) {
        return this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id_cotizacion FROM cotizaciones WHERE id_cotizacion = ${id} FOR UPDATE`;
            if (!estado) {
                throw new BadRequestException('El campo estado es obligatorio');
            }

            const permitidos: EstadoCotizacion[] = [
                'borrador',
                'enviada',
                'parcialmente_pagada',
                'aprobada',
                'rechazada',
                'expirada',
                'convertida_a_venta',
            ];
            if (!permitidos.includes(estado as EstadoCotizacion)) {
                throw new BadRequestException(`Estado inválido: ${estado}`);
            }

            const cot = await this.obtenerPorId(id, alcance, tx);
            const actual = String(cot.estado || 'borrador');

            const TRANSICIONES: Record<string, string[]> = {
                borrador: ['borrador', 'enviada', 'expirada'],
                enviada: ['enviada', 'borrador', 'aprobada', 'parcialmente_pagada', 'rechazada', 'expirada'],
                parcialmente_pagada: ['parcialmente_pagada', 'aprobada', 'rechazada', 'expirada'],
                aprobada: ['aprobada', 'convertida_a_venta', 'expirada'],
                rechazada: ['rechazada', 'borrador'],
                expirada: ['expirada', 'borrador'],
                convertida_a_venta: ['convertida_a_venta'],
            };
            const validas = TRANSICIONES[actual];
            if (!validas || !validas.includes(estado)) {
                throw new BadRequestException(
                    `Transición no permitida: "${actual}" → "${estado}"`,
                );
            }

            if (actual === estado) return cot;

            if (estado === 'aprobada' && actual !== 'aprobada') {
                await this.reservarStockCotizacion(tx, cot);
            }

            if (estado === 'convertida_a_venta') {
                if (actual === 'convertida_a_venta') return cot;
                await this.confirmarVentaCotizacion(tx, cot);
            }

            if (['expirada', 'rechazada'].includes(estado) && ['aprobada', 'enviada'].includes(actual)) {
                await this.liberarReservasCotizacion(tx, cot);
            }

            return tx.cotizacion.update({
                where: { id_cotizacion: id },
                data: {
                    estado: estado as any,
                    ...(estado === 'enviada' && !cot.tiempo_fin ? { tiempo_fin: new Date() } : {}),
                    ...(estado === 'convertida_a_venta' ? { convertida_en: new Date() } : {}),
                },
            });
        });
    }

    private async reservarStockCotizacion(tx: Prisma.TransactionClient, cot: any) {
        for (const item of cot.detalle) {
            const stock = await tx.stockActual.findUnique({
                where: { id_producto_id_almacen: { id_producto: item.id_producto, id_almacen: this.DEFAULT_ALMACEN_ID } },
            });
            if (!stock || stock.cantidad < item.cantidad) {
                throw new BadRequestException(
                    `Stock insuficiente para ${item.producto?.codigo || item.id_producto}: ${stock?.cantidad ?? 0} < ${item.cantidad}`,
                );
            }
            await tx.stockActual.update({
                where: { id_producto_id_almacen: { id_producto: item.id_producto, id_almacen: this.DEFAULT_ALMACEN_ID } },
                data: { cantidad: { decrement: item.cantidad } },
            });
            await tx.inventarioMovimiento.create({
                data: {
                    id_producto: item.id_producto,
                    id_almacen: this.DEFAULT_ALMACEN_ID,
                    tipo: 'salida',
                    origen: 'cotizacion_aprobada',
                    cantidad: item.cantidad,
                    stock_anterior: stock.cantidad,
                    stock_posterior: stock.cantidad - item.cantidad,
                    id_referencia: cot.id_cotizacion,
                    tipo_referencia: 'COTIZACION',
                },
            });
        }
    }

    private async confirmarVentaCotizacion(tx: Prisma.TransactionClient, cot: any) {
        const yaConvertida = await tx.inventarioMovimiento.findFirst({
            where: { id_referencia: cot.id_cotizacion, tipo_referencia: 'COTIZACION', origen: 'venta' },
        });
        if (yaConvertida) return;

        await tx.inventarioMovimiento.updateMany({
            where: { id_referencia: cot.id_cotizacion, tipo_referencia: 'COTIZACION', origen: 'cotizacion_aprobada' },
            data: { origen: 'venta' },
        });
    }

    private async liberarReservasCotizacion(tx: Prisma.TransactionClient, cot: any) {
        for (const item of cot.detalle) {
            const mov = await tx.inventarioMovimiento.findFirst({
                where: { id_referencia: cot.id_cotizacion, id_producto: item.id_producto, origen: 'cotizacion_aprobada' },
            });
            if (mov) {
                await tx.stockActual.update({
                    where: { id_producto_id_almacen: { id_producto: item.id_producto, id_almacen: this.DEFAULT_ALMACEN_ID } },
                    data: { cantidad: { increment: item.cantidad } },
                });
                await tx.inventarioMovimiento.create({
                    data: {
                        id_producto: item.id_producto,
                        id_almacen: this.DEFAULT_ALMACEN_ID,
                        tipo: 'entrada',
                        origen: 'devolucion_cliente',
                        cantidad: item.cantidad,
                        stock_anterior: mov.stock_posterior,
                        stock_posterior: mov.stock_posterior + item.cantidad,
                        id_referencia: cot.id_cotizacion,
                        tipo_referencia: 'COTIZACION',
                        observaciones: `Liberación por ${cot.estado}`,
                    },
                });
            }
        }
    }

    async registrarPago(id: number, data: RegistrarPagoDto, idUsuario: number, alcance: number | null = null) {
        await registrarPagoSeguro(this.prisma, id, data, idUsuario, alcance);
        return this.obtenerPorId(id, alcance);
    }
}