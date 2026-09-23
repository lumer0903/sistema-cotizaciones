import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CotizacionesService {
    constructor(private readonly prisma: PrismaService) { }

    async crear(data: any, idUsuario: number) {
        const {
            id_cliente,
            tipo_precio = 'normal',
            observaciones,
            incluye_carreta = false,
            costo_carreta = 0,
            detalle = [],
        } = data;

        if (!id_cliente) {
            throw new BadRequestException('El campo id_cliente es obligatorio');
        }

        if (!Array.isArray(detalle) || detalle.length === 0) {
            throw new BadRequestException('La cotización debe incluir al menos un producto en el detalle');
        }

        // Asegurar que el idUsuario sea válido o nulo si falla la extracción del JWT
        const userIdParsed = Number(idUsuario);
        const id_usuario = !isNaN(userIdParsed) && userIdParsed > 0 ? userIdParsed : null;

        const subtotal = detalle.reduce(
            (acc: number, item: any) => acc + Number(item.cantidad) * Number(item.precio_unitario),
            0,
        );
        const total = subtotal + Number(costo_carreta);

        const numero = data.numero || await this.generarNumeroSecuencial();

        try {
            return await this.prisma.$transaction(async (tx) => {
                const cotizacion = await tx.cotizacion.create({
                    data: {
                        numero,
                        id_cliente: Number(id_cliente),
                        id_usuario,
                        estado: 'borrador' as any,
                        tipo_precio: tipo_precio as any,
                        observaciones,
                        incluye_carreta: Boolean(incluye_carreta),
                        costo_carreta: Number(costo_carreta),
                        subtotal,
                        total,
                        detalle: {
                            create: detalle.map((item: any) => ({
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
            // Capturar fallos de Claves Foráneas (FK) en Prisma
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

    async listar(query: any) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (query.estado) where.estado = query.estado;
        if (query.id_cliente) where.id_cliente = Number(query.id_cliente);

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

    async obtenerPorId(id: number) {
        const cotizacion = await this.prisma.cotizacion.findUnique({
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

        return cotizacion;
    }

    /**
     * Genera el siguiente número secuencial COT-001, COT-002, ...
     * Ignora numeraciones antiguas largas (COT-<timestamp>) y continúa
     * desde el mayor correlativo corto existente.
     */
    async generarNumeroSecuencial(): Promise<string> {
        const ultimas = await this.prisma.cotizacion.findMany({
            select: { numero: true },
            orderBy: { id_cotizacion: 'desc' },
            take: 50,
        });
        let max = 0;
        for (const c of ultimas) {
            const m = /^COT-(\d{1,6})$/.exec(String(c.numero || '').trim());
            if (m) {
                const n = parseInt(m[1], 10);
                if (!isNaN(n) && n > max) max = n;
            }
        }
        // Si no hay correlativos cortos, partir de count+1 por si hay data antigua
        if (max === 0) {
            const total = await this.prisma.cotizacion.count();
            max = total;
            // Verificar que COT-(total+1) no exista (por timestamps no aplica, pero por seguridad)
            let candidato = max + 1;
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const existe = await this.prisma.cotizacion.findUnique({
                    where: { numero: `COT-${String(candidato).padStart(3, '0')}` },
                });
                if (!existe) {
                    max = candidato - 1;
                    break;
                }
                candidato++;
                if (candidato > max + 1000) break;
            }
        }
        const siguiente = max + 1;
        return `COT-${String(siguiente).padStart(3, '0')}`;
    }

    async proximoNumero(): Promise<{ numero: string }> {
        return { numero: await this.generarNumeroSecuencial() };
    }

    /**
     * Actualiza una cotización SOLO si está en BORRADOR.
     * El número correlativo NUNCA se modifica.
     * Si se envía `detalle`, reemplaza todas las líneas y recalcula subtotal/total.
     */
    async actualizar(id: number, data: any) {
        const actual = await this.obtenerPorId(id);

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
        } = data ?? {};

        if (detalle !== undefined && (!Array.isArray(detalle) || detalle.length === 0)) {
            throw new BadRequestException('La cotización debe incluir al menos un producto en el detalle');
        }

        const lineas = Array.isArray(detalle) ? detalle : null;
        const subtotal = lineas
            ? lineas.reduce(
                (acc: number, item: any) => acc + Number(item.cantidad) * Number(item.precio_unitario),
                0,
            )
            : Number(actual.subtotal);
        const carreta = incluye_carreta !== undefined
            ? Number(costo_carreta ?? 0)
            : Number(actual.costo_carreta);
        const total = subtotal + carreta;

        try {
            return await this.prisma.$transaction(async (tx) => {
                return tx.cotizacion.update({
                    where: { id_cotizacion: id },
                    data: {
                        ...(id_cliente !== undefined ? { id_cliente: Number(id_cliente) } : {}),
                        ...(tipo_precio !== undefined ? { tipo_precio: tipo_precio as any } : {}),
                        ...(observaciones !== undefined ? { observaciones } : {}),
                        ...(incluye_carreta !== undefined ? { incluye_carreta: Boolean(incluye_carreta) } : {}),
                        ...(costo_carreta !== undefined ? { costo_carreta: Number(costo_carreta) } : {}),
                        subtotal,
                        total,
                        ...(lineas
                            ? {
                                detalle: {
                                    deleteMany: {},
                                    create: lineas.map((item: any) => ({
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
    }

    async cambiarEstado(id: number, estado: string) {
        if (!estado) {
            throw new BadRequestException('El campo estado es obligatorio');
        }

        const permitidos = ['borrador', 'enviada', 'aprobada', 'parcialmente_pagada', 'rechazada'];
        if (!permitidos.includes(estado)) {
            throw new BadRequestException(`Estado inválido: ${estado}`);
        }

        await this.obtenerPorId(id);

        return this.prisma.cotizacion.update({
            where: { id_cotizacion: id },
            data: { estado: estado as any },
        });
    }

    async registrarPago(id: number, data: any, idUsuario: number) {
        if (!data || !data.monto || !data.metodo_pago) {
            throw new BadRequestException('Debe proporcionar el monto y el metodo_pago');
        }

        const monto = Number(data.monto);
        if (!(monto > 0)) {
            throw new BadRequestException('El monto debe ser mayor a 0');
        }

        const cot = await this.obtenerPorId(id);
        const estado = String((cot as any).estado || '');
        if (!['enviada', 'aprobada', 'parcialmente_pagada'].includes(estado)) {
            throw new BadRequestException(
                `No se pueden registrar pagos en estado "${estado}". Debe estar enviada o aprobada.`,
            );
        }

        const pagos = await this.prisma.cotizacionPago.findMany({
            where: { id_cotizacion: id },
            select: { monto: true },
        });
        const total = Number((cot as any).total || 0);
        const pagado = pagos.reduce((s, p) => s + Number(p.monto), 0);
        const saldo = total - pagado;
        if (monto > saldo + 0.009) {
            throw new BadRequestException(
                `El monto (S/ ${monto.toFixed(2)}) excede el saldo pendiente (S/ ${saldo.toFixed(2)})`,
            );
        }

        const nuevoPagado = pagado + monto;
        const nuevoEstado =
            nuevoPagado >= total - 0.009 ? 'aprobada' : 'parcialmente_pagada';

        await this.prisma.$transaction(async (tx) => {
            await tx.cotizacionPago.create({
                data: {
                    id_cotizacion: id,
                    id_usuario: Number(idUsuario) > 0 ? Number(idUsuario) : null,
                    monto,
                    metodo_pago: data.metodo_pago,
                    referencia: data.referencia || null,
                },
            });
            await tx.cotizacion.update({
                where: { id_cotizacion: id },
                data: { estado: nuevoEstado as any },
            });
        });

        return this.obtenerPorId(id);
    }
}