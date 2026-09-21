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

        const numero = data.numero || `COT-${Date.now()}`;

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

    async cambiarEstado(id: number, estado: string) {
        if (!estado) {
            throw new BadRequestException('El campo estado es obligatorio');
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

        await this.obtenerPorId(id);

        return this.prisma.cotizacionPago.create({
            data: {
                id_cotizacion: id,
                id_usuario: Number(idUsuario) || null,
                monto: Number(data.monto),
                metodo_pago: data.metodo_pago,
                referencia: data.referencia || null,
            },
        });
    }
}