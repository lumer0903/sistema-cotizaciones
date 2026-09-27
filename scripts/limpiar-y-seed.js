let PrismaClient;
const rutasPrisma = [
    '../packages/database/node_modules/@prisma/client',
    '../packages/database',
    '@prisma/client',
];

for (const ruta of rutasPrisma) {
    try {
        PrismaClient = require(ruta).PrismaClient;
        if (PrismaClient) break;
    } catch (e) { }
}

if (!PrismaClient) {
    console.error('No se pudo instanciar PrismaClient.');
    process.exit(1);
}

const prisma = new PrismaClient();

const PRODUCTOS_SEED = [
    {
        codigo: 'FUG-09',
        descripcion: 'FLOR ARTIFICIAL DE FUGU ROSA EN RAMO X 6 CABEZAS',
        categoria: 'FLOR ARTIFICIAL',
        presentacion: 'RAMO',
        tipo_flor: 'ROSA',
        follaje: null,
        composicion: 'PLASTICO',
        numero_cabezas: 6,
        tamano: '25 CM',
        stock: 100,
        precios: {
            costo_normal: 12.5, precio_mayor_normal: 18.0, precio_docena_normal: 21.5, precio_unidad_normal: 25.9,
            costo_distribuidor: 10.0, precio_mayor_dist: 15.0, precio_docena_dist: 18.0, precio_unidad_dist: 21.0,
        },
    },
    {
        codigo: 'FUG-10',
        descripcion: 'FLOR ARTIFICIAL DE FUGU TULIPAN EN VARA X 1 CABEZA',
        categoria: 'FLOR ARTIFICIAL',
        presentacion: 'VARA',
        tipo_flor: 'TULIPAN',
        follaje: null,
        composicion: 'PLASTICO',
        numero_cabezas: 1,
        tamano: '38 CM',
        stock: 200,
        precios: {
            costo_normal: 8.4, precio_mayor_normal: 12.6, precio_docena_normal: 15.1, precio_unidad_normal: 18.2,
            costo_distribuidor: 7.0, precio_mayor_dist: 10.5, precio_docena_dist: 12.6, precio_unidad_dist: 15.0,
        },
    },
    {
        codigo: 'FUG-11',
        descripcion: 'FLOR ARTIFICIAL DE FUGU GIRASOL EN GUIA X 9 FLORES 40 CM',
        categoria: 'FLOR ARTIFICIAL',
        presentacion: 'GUIA',
        tipo_flor: 'GIRASOL',
        follaje: null,
        composicion: 'PLASTICO',
        numero_cabezas: 9,
        tamano: '40 CM',
        stock: 3600,
        precios: {
            costo_normal: 3.2, precio_mayor_normal: 4.8, precio_docena_normal: 5.75, precio_unidad_normal: 6.9,
            costo_distribuidor: 2.65, precio_mayor_dist: 4.0, precio_docena_dist: 4.75, precio_unidad_dist: 5.7,
        },
    },
    {
        codigo: 'RYG10-RCH',
        descripcion: 'FLOR ARTIFICIAL ROSA RELAMPAGO EN VARA X 9 40 CM',
        categoria: 'FLOR ARTIFICIAL',
        presentacion: 'VARA',
        tipo_flor: 'ROSA',
        follaje: null,
        composicion: 'PLASTICO',
        numero_cabezas: 9,
        tamano: '40 CM',
        stock: 150,
        precios: {
            costo_normal: 13.56, precio_mayor_normal: 16.7, precio_docena_normal: 20.0, precio_unidad_normal: 24.0,
            costo_distribuidor: 11.74, precio_mayor_dist: 14.4, precio_docena_dist: 17.3, precio_unidad_dist: 20.8,
        },
    },
    {
        codigo: 'RYG18-NU02',
        descripcion: 'RAMO FLOR ARTIFICIAL NUPTIAL MIXTA CON FOLLAJE HIGUERA 30 CM',
        categoria: 'FLOR ARTIFICIAL',
        presentacion: 'RAMO',
        tipo_flor: 'MARGARITA',
        follaje: 'HIGUERA',
        composicion: null,
        numero_cabezas: 12,
        tamano: '30 CM',
        stock: 45,
        precios: {
            costo_normal: 45.0, precio_mayor_normal: 62.0, precio_docena_normal: 74.0, precio_unidad_normal: 89.0,
            costo_distribuidor: 38.5, precio_mayor_dist: 54.0, precio_docena_dist: 64.0, precio_unidad_dist: 77.0,
        },
    },
    {
        codigo: 'DD-01N',
        descripcion: 'PASTO DECORATIVO EN PANEL NEGRO 60*60 CM',
        categoria: 'PASTO Y PANELS',
        presentacion: 'REJA',
        tipo_flor: null,
        follaje: null,
        composicion: 'PLASTICO',
        numero_cabezas: null,
        tamano: '60*60 CM',
        stock: 14,
        precios: {
            costo_normal: 22.0, precio_mayor_normal: 31.0, precio_docena_normal: 37.0, precio_unidad_normal: 44.5,
            costo_distribuidor: 18.5, precio_mayor_dist: 26.5, precio_docena_dist: 31.5, precio_unidad_dist: 38.0,
        },
    },
    {
        codigo: 'PASTO-50',
        descripcion: 'PASTO ARTIFICIAL EN VARA X 50 UNIDADES 90 CM',
        categoria: 'PASTO Y PANELS',
        presentacion: 'VARA',
        tipo_flor: null,
        follaje: null,
        composicion: 'PLASTICO',
        numero_cabezas: 50,
        tamano: '90 CM',
        stock: 500,
        precios: {
            costo_normal: 5.9, precio_mayor_normal: 8.4, precio_docena_normal: 10.1, precio_unidad_normal: 12.0,
            costo_distribuidor: 4.9, precio_mayor_dist: 7.1, precio_docena_dist: 8.5, precio_unidad_dist: 10.2,
        },
    },
    {
        codigo: 'DECOR-12',
        descripcion: 'CANDELABRO DECORATIVO METALICO 45 CM',
        categoria: 'DECORACION',
        presentacion: 'UNITARIO',
        tipo_flor: null,
        follaje: null,
        composicion: 'METAL',
        numero_cabezas: null,
        tamano: '45 CM',
        stock: 80,
        precios: {
            costo_normal: 67.0, precio_mayor_normal: 95.0, precio_docena_normal: 112.0, precio_unidad_normal: 135.0,
            costo_distribuidor: 58.0, precio_mayor_dist: 82.0, precio_docena_dist: 97.0, precio_unidad_dist: 116.0,
        },
    },
    {
        codigo: 'CANDE-07',
        descripcion: 'CANASTA DECORATIVA CON FLORES 30*20 CM',
        categoria: 'DECORACION',
        presentacion: 'CANASTA',
        tipo_flor: 'MARGARITA',
        follaje: null,
        composicion: null,
        numero_cabezas: 8,
        tamano: '30*20 CM',
        stock: 36,
        precios: {
            costo_normal: 19.9, precio_mayor_normal: 28.5, precio_docena_normal: 33.9, precio_unidad_normal: 40.7,
            costo_distribuidor: 17.0, precio_mayor_dist: 24.5, precio_docena_dist: 29.2, precio_unidad_dist: 35.0,
        },
    },
    {
        codigo: 'VASO-03',
        descripcion: 'VASO DE VIDRIO DECORATIVO 12 CM',
        categoria: 'OTROS',
        presentacion: 'UNITARIO',
        tipo_flor: null,
        follaje: null,
        composicion: 'VIDRIO',
        numero_cabezas: null,
        tamano: '12 CM',
        stock: 5000,
        precios: {
            costo_normal: 2.1, precio_mayor_normal: 3.15, precio_docena_normal: 3.75, precio_unidad_normal: 4.5,
            costo_distribuidor: 1.75, precio_mayor_dist: 2.65, precio_docena_dist: 3.15, precio_unidad_dist: 3.8,
        },
    },
];

async function vaciar(tabla, modelo) {
    const { count } = await modelo.deleteMany();
    console.log(`  ${tabla}: ${count} filas eliminadas`);
    return count;
}

async function main() {
    console.log('=== LIMPIEZA Y SEED DE PRODUCTOS ===\n');
    console.log('Fase 1: limpieza...');

    await vaciar('cotizacion_detalle', prisma.cotizacionDetalle);
    await vaciar('historial_precios', prisma.historialPrecios);
    await vaciar('precios_actuales', prisma.preciosActuales);
    await vaciar('stock_actual', prisma.stockActual);
    await vaciar('inventario_movimientos', prisma.inventarioMovimiento);
    await vaciar('alertas_stock', prisma.alertas_stock);
    const borrados = await vaciar('productos', prisma.producto);

    console.log('\nFase 2: creando 10 productos de prueba...');

    let almacen = await prisma.almacen.findFirst({ where: { codigo: 'ALM-01' } });
    if (!almacen) {
        almacen = await prisma.almacen.create({
            data: { codigo: 'ALM-01', nombre: 'Almacen Principal', ubicacion: 'General', activo: true },
        });
    }

    const catCache = new Map();
    let creados = 0;

    for (const item of PRODUCTOS_SEED) {
        await prisma.$transaction(async (tx) => {
            let cat = catCache.get(item.categoria);
            if (!cat) {
                cat = await tx.categoria.findFirst({ where: { nombre_categoria: item.categoria } });
                if (!cat) {
                    cat = await tx.categoria.create({ data: { nombre_categoria: item.categoria } });
                }
                catCache.set(item.categoria, cat);
            }

            const prod = await tx.producto.create({
                data: {
                    codigo: item.codigo,
                    descripcion: item.descripcion,
                    id_categoria: cat.id_categoria,
                    presentacion: item.presentacion,
                    tipo_flor: item.tipo_flor,
                    composicion: item.composicion,
                    follaje: item.follaje,
                    numero_cabezas: item.numero_cabezas,
                    tamano: item.tamano,
                    foto_url: null,
                    stock_principal: item.stock,
                    stock_total: item.stock,
                    activo: true,
                },
            });

            await tx.preciosActuales.create({
                data: {
                    id_producto: prod.id_producto,
                    ...item.precios,
                },
            });

            await tx.stockActual.create({
                data: {
                    id_producto: prod.id_producto,
                    id_almacen: almacen.id_almacen,
                    cantidad: item.stock,
                },
            });

            creados++;
            console.log(`  [${creados}/10] ${item.codigo} - stock ${item.stock} - ${item.categoria}`);
        });
    }

    const [totalProd, totalPrecios, totalStock] = await Promise.all([
        prisma.producto.count(),
        prisma.preciosActuales.count(),
        prisma.stockActual.count(),
    ]);

    console.log('\n========================================');
    console.log(`Productos eliminados: ${borrados}`);
    console.log(`Productos creados: ${creados}`);
    console.log(`Productos en BD: ${totalProd}`);
    console.log(`Precios en BD: ${totalPrecios}`);
    console.log(`Stock en BD: ${totalStock}`);
    console.log('========================================\n');

    if (totalProd !== 10 || creados !== 10) {
        console.error('ERROR: se esperaban exactamente 10 productos.');
        process.exitCode = 1;
    }
}

main()
    .catch((e) => { console.error('Error:', e); process.exitCode = 1; })
    .finally(async () => await prisma.$disconnect());
