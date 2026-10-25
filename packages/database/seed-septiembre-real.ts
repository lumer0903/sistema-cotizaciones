import { PrismaClient, EstadoCotizacion, TipoVenta, MetodoPago, TipoPrecio } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Ingestando Cotizaciones con Enum TipoPrecio (normal vs distribuidor) ---');

    // 1. Limpieza de tablas
    await prisma.cotizacionPago.deleteMany({});
    await prisma.iaInteracciones.deleteMany({});
    await prisma.cotizacionDetalle.deleteMany({});
    await prisma.cotizacion.deleteMany({});

    // 2. Obtener usuario asesor activo
    const asesor = await prisma.usuario.findFirst({ where: { activo: true } });
    if (!asesor) throw new Error('Debe existir al menos un usuario activo en la base de datos.');

    // 3. Matriz de 40 Cotizaciones Reales
    const cotizacionesData = [
        // --- COTIZACIONES ACEPTADAS (22 Cotizaciones = S/ 72,019.10) ---
        { num: '001', cliente: 'ALANA', total: 8380.00, esAceptada: true, carreta: 10.0, detalles: [{ codigo: 'RYG18-NU02', descripcion: 'FLOR ARTIFICIAL EN RAMO X 18', cantidad: 540, precio: 15.50 }] },
        { num: '002', cliente: 'CELINE NAVARRO', total: 561.00, esAceptada: true, carreta: 15.0, detalles: [{ codigo: 'RYG10-H17', descripcion: 'FLOR ARTIFICIAL ROSA PEQUEÑA', cantidad: 12, precio: 10.00 }] },
        { num: '003', cliente: 'EDITHA', total: 14876.00, esAceptada: true, carreta: 0.0, detalles: [{ codigo: 'RYG18-NU02', descripcion: 'FLOR ARTIFICIAL EN RAMO X 18', cantidad: 360, precio: 15.20 }] },
        { num: '004', cliente: 'EDITHA', total: 8208.00, esAceptada: true, carreta: 0.0, detalles: [{ codigo: 'RYG18-NU02', descripcion: 'FLOR ARTIFICIAL EN RAMO X 18', cantidad: 540, precio: 15.20 }] },
        { num: '005', cliente: 'EVER', total: 10980.00, esAceptada: true, carreta: 0.0, detalles: [{ codigo: 'RYG18-NU02', descripcion: 'FLOR ARTIFICIAL X 18', cantidad: 360, precio: 15.50 }] },
        { num: '006', cliente: 'GLORIA', total: 3513.00, esAceptada: true, carreta: 15.0, detalles: [{ codigo: 'RYG12-214', descripcion: 'FLOR ARTIFICIAL ROSA BOTON', cantidad: 120, precio: 10.50 }] },
        { num: '009', cliente: 'MECHITA', total: 1030.00, esAceptada: true, carreta: 10.0, detalles: [{ codigo: 'E198', descripcion: 'FLOR ARTIFICIAL EN RAMO X 10', cantidad: 120, precio: 8.50 }] },
        { num: '010', cliente: 'MECHITA', total: 1234.00, esAceptada: true, carreta: 10.0, detalles: [{ codigo: 'E198', descripcion: 'FLOR ARTIFICIAL EN RAMO X 10', cantidad: 144, precio: 8.50 }] },
        { num: '011', cliente: 'MECHITA', total: 3197.20, esAceptada: true, carreta: 10.0, detalles: [{ codigo: 'E198', descripcion: 'FLOR ARTIFICIAL EN RAMO X 10', cantidad: 384, precio: 8.30 }] },
        { num: '012', cliente: 'MEDALY', total: 475.00, esAceptada: true, carreta: 10.0, detalles: [{ codigo: 'RYG9-210', descripcion: 'FLOR ARTIFICIAL ROSA EN RAMO', cantidad: 30, precio: 15.50 }] },
        { num: '013', cliente: 'MUEBLES DUVAND', total: 468.00, esAceptada: true, carreta: 0.0, detalles: [{ codigo: '1501', descripcion: 'PEDESTAL DE PLASTICO', cantidad: 12, precio: 39.00 }] },
        { num: '015', cliente: 'PANORAMA', total: 4842.00, esAceptada: true, carreta: 0.0, detalles: [{ codigo: 'RYG5C-', descripcion: 'FLOR ARTIFICIAL EN RAMO X 5', cantidad: 300, precio: 5.50 }] },
        { num: '016', cliente: 'ROCIO', total: 418.00, esAceptada: true, carreta: 10.0, detalles: [{ codigo: 'RYG10-XM', descripcion: 'FLOR ARTIFICIAL EN RAMO X 10', cantidad: 48, precio: 8.50 }] },
        { num: '018', cliente: 'ROXANA', total: 570.00, esAceptada: true, carreta: 0.0, detalles: [{ codigo: '1502', descripcion: 'PEDESTAL DE PLASTICO DE 90 CM', cantidad: 8, precio: 39.00 }] },
        { num: '019', cliente: 'ROXANA', total: 322.00, esAceptada: true, carreta: 10.0, detalles: [{ codigo: '1502', descripcion: 'PEDESTAL DE PLASTICO DE 90 CM', cantidad: 8, precio: 39.00 }] },
        { num: '020', cliente: 'ROXANA', total: 139.00, esAceptada: true, carreta: 10.0, detalles: [{ codigo: '1715', descripcion: 'COPA DE PLASTICO DE 50', cantidad: 6, precio: 21.50 }] },
        { num: '021', cliente: 'ROXANA', total: 322.00, esAceptada: true, carreta: 10.0, detalles: [{ codigo: '1501', descripcion: 'PEDESTAL DE PLASTICO', cantidad: 4, precio: 39.00 }] },
        { num: '022', cliente: 'SORAIDA', total: 1838.00, esAceptada: true, carreta: 10.0, detalles: [{ codigo: 'RYG18-232', descripcion: 'FLOR ARTIFICIAL ROSA DEL VALLE', cantidad: 74, precio: 16.00 }] },
        { num: '026', cliente: 'ELFERES', total: 2015.60, esAceptada: true, carreta: 20.0, detalles: [{ codigo: 'GRS7-02', descripcion: 'FLOR ARTIFICIAL EN RAMO X 7', cantidad: 102, precio: 9.50 }] },
        { num: '028', cliente: 'GABRIELA', total: 4054.00, esAceptada: true, carreta: 30.0, detalles: [{ codigo: '2007B', descripcion: 'FLORERO DE PLASTICO', cantidad: 200, precio: 1.70 }] },
        { num: '030', cliente: 'LAURO', total: 3991.20, esAceptada: true, carreta: 25.0, detalles: [{ codigo: 'V-GRSS-01', descripcion: 'FLOR ARTIFICIAL GIRASOL EN VARA', cantidad: 456, precio: 6.50 }] },
        { num: '035', cliente: 'VICTOR RAUL', total: 952.50, esAceptada: true, carreta: 15.0, detalles: [{ codigo: 'RYG10-RCH', descripcion: 'FLOR ARTIFICIAL ROSA EN RAMO', cantidad: 75, precio: 12.50 }] },

        // --- ENVIADAS / PENDIENTES (18 Cotizaciones = S/ 15,850.90) ---
        { num: '007', cliente: 'JHON', total: 14894.00, esAceptada: false, carreta: 0.0, detalles: [{ codigo: 'RYG18-NU02', descripcion: 'FLOR ARTIFICIAL EN RAMO X 18', cantidad: 540, precio: 15.50 }] },
        { num: '008', cliente: 'MARLI', total: 256.00, esAceptada: false, carreta: 10.0, detalles: [{ codigo: 'RYG11-H13', descripcion: 'FLOR ARTIFICIAL ROSA REYNA', cantidad: 12, precio: 8.00 }] },
        { num: '014', cliente: 'NATY', total: 290.50, esAceptada: false, carreta: 10.0, detalles: [{ codigo: 'RYG10-XM', descripcion: 'FLOR ARTIFICIAL EN RAMO X 10', cantidad: 33, precio: 8.50 }] },
        { num: '017', cliente: 'ROCIO', total: 1270.00, esAceptada: false, carreta: 10.0, detalles: [{ codigo: 'RYG18-H05', descripcion: 'FLOR ARTIFICIAL ROSA RISUEÑA', cantidad: 84, precio: 15.00 }] },
        { num: '023', cliente: 'CELENI NAVARRO', total: 128.20, esAceptada: false, carreta: 10.0, detalles: [{ codigo: 'TNK5-03', descripcion: 'FLOR ARTIFICIAL EN RAMO CHICO', cantidad: 12, precio: 5.00 }] },
        { num: '024', cliente: 'DAVID', total: 390.00, esAceptada: false, carreta: 15.0, detalles: [{ codigo: 'SM9-11', descripcion: 'FLOR ARTIFICIAL GIRASOL', cantidad: 20, precio: 9.00 }] },
        { num: '025', cliente: 'DAVID', total: 370.00, esAceptada: false, carreta: 15.0, detalles: [{ codigo: 'ROST-01', descripcion: 'FLOR ARTIFICIAL HORTENSIAS', cantidad: 25, precio: 8.00 }] },
        { num: '027', cliente: 'ESTEBAN', total: 1259.00, esAceptada: false, carreta: 30.0, detalles: [{ codigo: 'RYG5-OT', descripcion: 'FLOR ARTIFICIAL X 5', cantidad: 30, precio: 13.50 }] },
        { num: '029', cliente: 'HERLIN', total: 495.00, esAceptada: false, carreta: 15.0, detalles: [{ codigo: 'RYG5-4', descripcion: 'FLOR ARTIFICIAL X 5', cantidad: 6, precio: 8.00 }] },
        { num: '031', cliente: 'JUANA', total: 1033.00, esAceptada: false, carreta: 25.0, detalles: [{ codigo: 'RUY-CH', descripcion: 'FLOR ARTIFICIAL EN RAMO X 7', cantidad: 24, precio: 12.00 }] },
        { num: '032', cliente: 'MIS AMORES', total: 4384.20, esAceptada: false, carreta: 10.0, detalles: [{ codigo: 'SM10-02', descripcion: 'FLOR ARTIFICIAL HOUR DOLCE', cantidad: 24, precio: 8.00 }] },
        { num: '033', cliente: 'NATALY', total: 4156.50, esAceptada: false, carreta: 15.0, detalles: [{ codigo: 'RYG9-228', descripcion: 'FLOR ARTIFICIAL ROSA MEXICANA', cantidad: 87, precio: 14.50 }] },
        { num: '034', cliente: 'ROCIO', total: 146.00, esAceptada: false, carreta: 20.0, detalles: [{ codigo: 'RYG12-214', descripcion: 'FLOR ARTIFICIAL ROSA BOTON', cantidad: 12, precio: 10.50 }] },
        { num: '036', cliente: 'MECK', total: 465.00, esAceptada: false, carreta: 15.0, detalles: [{ codigo: 'SM5-05', descripcion: 'FLOR ARTIFICIAL ILUSION', cantidad: 150, precio: 2.50 }] },
        { num: '037', cliente: 'MORA', total: 2102.60, esAceptada: false, carreta: 15.0, detalles: [{ codigo: 'EU-04', descripcion: 'HOJA ARTIFICIAL', cantidad: 48, precio: 11.90 }] },
        { num: '038', cliente: 'WALTER', total: 2612.00, esAceptada: false, carreta: 20.0, detalles: [{ codigo: 'MJ-03', descripcion: 'ADORNO PARA JARDIN PICAFLOR', cantidad: 144, precio: 4.00 }] },
        { num: '039', cliente: 'ROSA LOVE', total: 1750.00, esAceptada: false, carreta: 30.0, detalles: [{ codigo: '2007B', descripcion: 'FLORERO DE PLASTICO', cantidad: 200, precio: 1.70 }] },
        { num: '040', cliente: 'CARMEN', total: 693.60, esAceptada: false, carreta: 30.0, detalles: [{ codigo: 'RYG12-LU', descripcion: 'FLOR ARTIFICIAL X 12', cantidad: 42, precio: 15.80 }] }
    ];

    for (const item of cotizacionesData) {
        // Si la cotización es mayor o igual a 2,000 soles usará TipoPrecio.distribuidor; si no, TipoPrecio.normal (Tienda)
        const tipoCalculado: TipoPrecio = item.total >= 2000 ? TipoPrecio.distribuidor : TipoPrecio.normal;

        let clienteBD = await prisma.cliente.findFirst({
            where: { nombre: { equals: item.cliente, mode: 'insensitive' } }
        });

        if (!clienteBD) {
            clienteBD = await prisma.cliente.create({
                data: {
                    nombre: item.cliente,
                    telefono: '987654321',
                    tipo: tipoCalculado
                }
            });
        } else {
            await prisma.cliente.update({
                where: { id_cliente: clienteBD.id_cliente },
                data: { tipo: tipoCalculado }
            });
        }

        const detallesProcesados = [];
        for (const d of item.detalles) {
            let prod = await prisma.producto.findFirst({ where: { codigo: d.codigo } });
            if (!prod) {
                prod = await prisma.producto.create({
                    data: { codigo: d.codigo, descripcion: d.descripcion, activo: true }
                });
            }
            detallesProcesados.push({
                id_producto: prod.id_producto,
                tipo_venta: TipoVenta.unidad,
                cantidad: d.cantidad,
                precio_unitario: d.precio,
                subtotal: d.cantidad * d.precio
            });
        }

        let minRespuesta = item.total >= 2000 ? Math.floor(Math.random() * 40) + 75 : Math.floor(Math.random() * 20) + 15;
        const estadoCot: EstadoCotizacion = item.esAceptada ? EstadoCotizacion.aprobada : EstadoCotizacion.enviada;
        const fechaInicio = new Date(2026, 8, Math.floor(Math.random() * 20) + 1, 10, 0);
        const fechaFin = new Date(fechaInicio.getTime() + minRespuesta * 60000);

        const cotizacionCreated = await prisma.cotizacion.create({
            data: {
                numero: `COT-202609-${item.num}`,
                usuario: { connect: { id_usuario: asesor.id_usuario } },
                cliente: { connect: { id_cliente: clienteBD.id_cliente } },
                tipo_precio: tipoCalculado,
                estado: estadoCot,
                subtotal: item.total - item.carreta,
                total: item.total,
                incluye_carreta: item.carreta > 0,
                costo_carreta: item.carreta,
                tiempo_inicio: fechaInicio,
                tiempo_fin: fechaFin,
                created_at: fechaInicio,
                detalle: { create: detallesProcesados }
            }
        });

        if (item.esAceptada) {
            await prisma.cotizacionPago.create({
                data: {
                    id_cotizacion: cotizacionCreated.id_cotizacion,
                    monto: item.total,
                    metodo_pago: MetodoPago.transferencia,
                    id_usuario: asesor.id_usuario,
                    created_at: fechaInicio
                }
            });
        }

        const primerDetalle = detallesProcesados[0];
        if (primerDetalle) {
            await prisma.iaInteracciones.create({
                data: {
                    id_cotizacion: cotizacionCreated.id_cotizacion,
                    id_usuario: asesor.id_usuario,
                    id_producto: primerDetalle.id_producto,
                    prompt: `Sugerencia IA para cotización ${item.num} de ${item.cliente}`,
                    respuesta: `Recomendación procesada para ${item.cliente}`,
                    created_at: fechaInicio
                }
            });
        }
    }

    console.log('✅ Base de datos poblada usando TipoPrecio (normal y distribuidor).');
}

main()
    .catch((e) => console.error('Error:', e))
    .finally(async () => await prisma.$disconnect());