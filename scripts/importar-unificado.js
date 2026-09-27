const path = require('path');
const fs = require('fs');

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

const ARCHIVO_CSV = path.join(process.cwd(), 'archivos_excel', 'PRODUCTOS-UNIDOS.csv');
const CARPETA_IMAGENES = path.join(process.cwd(), 'public', 'productos');

// 1. Extraer Categoría General
function extraerCategoria(desc) {
    const d = desc.toUpperCase();
    if (d.includes('MASCARILLA') || d.includes('KN-95') || d.includes('KN95') || d.includes('PROTECTOR FACIAL') || d.includes('PONCHO') || d.includes('GORRO') || d.includes('DELANTAL') || d.includes('COBERTOR')) return 'PROTECCION MEDICA';
    if (d.includes('FLOR ARTIFICIAL') || d.includes('FLOR ARTICICIAL')) return 'FLOR ARTIFICIAL';
    if (d.includes('PLANTA ARTIFICIAL') || d.includes('PLANTA ARTIFICIA')) return 'PLANTA ARTIFICIAL';
    if (d.includes('HOJA') || d.includes('HOJAS') || d.includes('FOLLAJE') || d.includes('GUIA') || d.includes('ENREDADERA')) return 'FOLLAJE / HOJAS';
    if (d.includes('FLORERO') || d.includes('MACETERO') || d.includes('CANASTA')) return 'FLOREROS Y MACETEROS';
    if (d.includes('CUADRO')) return 'CUADROS';
    if (d.includes('PASTO') || d.includes('REJA DE HOJAS') || d.includes('PANEL DECORATIVO')) return 'PASTO Y PANELS';
    if (d.includes('ADORNO') || d.includes('CANDELABRO') || d.includes('BONSAI') || d.includes('CUPULA') || d.includes('GEMAS')) return 'DECORACION';
    if (d.includes('MAQUINA') || d.includes('BOBINA') || d.includes('PASTEURIZACION')) return 'MAQUINARIA / INDUSTRIAL';
    return 'OTROS';
}

// 2. Extraer Presentación
function extraerPresentacion(desc) {
    const d = desc.toUpperCase();
    if (d.includes('EN RAMO') || d.includes('RAMO')) return 'RAMO';
    if (d.includes('EN VARA') || d.includes('VARA')) return 'VARA';
    if (d.includes('EN GUIA') || d.includes('GUIA') || d.includes('GUÍA') || d.includes('CADENA')) return 'GUIA';
    if (d.includes('ENREDADERA')) return 'ENREDADERA';
    if (d.includes('CORONA')) return 'CORONA';
    if (d.includes('PEDESTAL')) return 'PEDESTAL';
    if (d.includes('REJA')) return 'REJA';
    if (d.includes('CANASTA')) return 'CANASTA';
    if (d.includes('BOUQUET') || d.includes('BUQUET')) return 'BOUQUET';
    if (d.includes('UNITARIO')) return 'UNITARIO';
    return null;
}

// 3. Extraer Tipo de Flor
function extraerTipoFlor(desc) {
    const d = desc.toUpperCase();
    if (d.includes('ROSITA') || d.includes('ROSA')) return 'ROSA';
    if (d.includes('GIRASOL') || d.includes('MIRASOL') || d.includes('SOL')) return 'GIRASOL';
    if (d.includes('TULIPAN') || d.includes('TULIPÁN')) return 'TULIPAN';
    if (d.includes('CRISANTEMO')) return 'CRISANTEMO';
    if (d.includes('MARGARITA')) return 'MARGARITA';
    if (d.includes('HORTENSIA') || d.includes('HORTENSIAS')) return 'HORTENSIA';
    if (d.includes('ORQUIDEA') || d.includes('ORQUÍDEA')) return 'ORQUIDEA';
    if (d.includes('PEONIA') || d.includes('PEONÍA')) return 'PEONIA';
    if (d.includes('AZUCENA')) return 'AZUCENA';
    if (d.includes('LIRIO')) return 'LIRIO';
    if (d.includes('DURAZNO')) return 'DURAZNO';
    if (d.includes('AVE DEL PARAISO')) return 'AVE DEL PARAISO';
    if (d.includes('CARTUCHO')) return 'CARTUCHO';
    if (d.includes('BOMBONES') || d.includes('BOMBON')) return 'BOMBONES';
    if (d.includes('DALIA')) return 'DALIA';
    if (d.includes('MAGNOLIA')) return 'MAGNOLIA';
    if (d.includes('GERANIO')) return 'GERANIO';
    if (d.includes('PETUNIA')) return 'PETUNIA';
    if (d.includes('ZINIA')) return 'ZINIA';
    if (d.includes('ANTHURIUM')) return 'ANTHURIUM';
    if (d.includes('GLADIOLO')) return 'GLADIOLO';
    return null;
}

// 4. Extraer Composición / Material
function extraerComposicion(desc) {
    const d = desc.toUpperCase();
    if (d.includes('PLASTICO') || d.includes('PLÁSTICO')) return 'PLASTICO';
    if (d.includes('CERAMICA') || d.includes('CERÁMICA')) return 'CERAMICA';
    if (d.includes('VIDRIO')) return 'VIDRIO';
    if (d.includes('METAL')) return 'METAL';
    if (d.includes('PELUCHE')) return 'PELUCHE';
    if (d.includes('CARTON') || d.includes('CARTÓN')) return 'CARTON';
    return null;
}

// 5. Extraer Follaje / Tipo de Hoja
function extraerFollaje(desc) {
    const d = desc.toUpperCase();
    if (d.includes('HELECHO')) return 'HELECHO';
    if (d.includes('FRONDAS')) return 'FRONDAS';
    if (d.includes('EUCALIPTO')) return 'EUCALIPTO';
    if (d.includes('MENTA')) return 'MENTA';
    if (d.includes('HIGUERA')) return 'HIGUERA';
    if (d.includes('FICU')) return 'FICU';
    if (d.includes('PALMERA') || d.includes('PALMAS')) return 'PALMERA';
    if (d.includes('BOA')) return 'BOA';
    if (d.includes('HIEDRA')) return 'HIEDRA';
    if (d.includes('CEBRA')) return 'CEBRA';
    if (d.includes('OLIVO') || d.includes('ACEITUNA')) return 'OLIVO';
    if (d.includes('COSTILLA DE ADAN')) return 'COSTILLA DE ADAN';
    return null;
}

// 6. Extraer Cantidad de Cabezas / Flores / Varas
function extraerCabezas(desc) {
    const matchX = desc.match(/X\s*(\d+)/i);
    if (matchX) return parseInt(matchX[1], 10);

    const matchCab = desc.match(/(\d+)\s*(CABEZAS|CAB|FLORES|HOJAS|PUNTAS|CAPAS)/i);
    if (matchCab) return parseInt(matchCab[1], 10);

    return null;
}

// 7. Extraer Dimensiones / Medidas
function extraerDimensiones(desc) {
    const matchCm = desc.match(/\d+[\.\d]*\*\d+[\.\d]*(\*\d+[\.\d]*)?\s*(CM|MM)?/i);
    if (matchCm) return matchCm[0];

    const matchX = desc.match(/\d+[\.\d]*\s*X\s*\d+[\.\d]*(\s*X\s*\d+[\.\d]*)?\s*(CM|MM|MTS|M)?/i);
    if (matchX) return matchX[0];

    const matchMts = desc.match(/\d+[\.\d]*\s*(MTS|MT|M)\b/i);
    if (matchMts) return matchMts[0];

    const matchSoloCm = desc.match(/\d+[\.\d]*\s*CM\b/i);
    if (matchSoloCm) return matchSoloCm[0];

    return null;
}

// 8. Buscar imagen física
function buscarImagen(codigo) {
    if (!fs.existsSync(CARPETA_IMAGENES)) return null;
    const extList = ['.png', '.jpg', '.jpeg', '.webp'];
    const codClean = codigo.replace(/[/\\?%*:|"<>]/g, '_');

    for (const ext of extList) {
        const file = `${codClean}${ext}`;
        if (fs.existsSync(path.join(CARPETA_IMAGENES, file))) {
            return `/productos/${file}`;
        }
    }
    return null;
}

function parsearCsv(texto) {
    const registros = [];
    let campos = [];
    let campo = '';
    let enComillas = false;

    for (let i = 0; i < texto.length; i++) {
        const ch = texto[i];
        if (enComillas) {
            if (ch === '"') {
                if (texto[i + 1] === '"') {
                    campo += '"';
                    i++;
                } else {
                    enComillas = false;
                }
            } else {
                campo += ch;
            }
        } else if (ch === '"' && campo === '') {
            enComillas = true;
        } else if (ch === '"') {
            campo += ch;
        } else if (ch === ';') {
            campos.push(campo.trim());
            campo = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && texto[i + 1] === '\n') i++;
            campos.push(campo.trim());
            if (campos.some((c) => c !== '')) registros.push(campos);
            campos = [];
            campo = '';
        } else {
            campo += ch;
        }
    }
    if (campo !== '' || campos.length) {
        campos.push(campo.trim());
        if (campos.some((c) => c !== '')) registros.push(campos);
    }
    return registros;
}

function aNumero(valor) {
    const n = parseFloat(String(valor).replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
}

function valorEn(fila, indice) {
    if (indice === undefined || indice < 0) return '';
    return fila[indice] !== undefined ? fila[indice] : '';
}

async function main() {
    console.log('Iniciando analisis y carga desde la hoja unificada PRODUCTOS-UNIDOS.csv...\n');
    const inicio = Date.now();

    let contenido;
    try {
        contenido = fs.readFileSync(ARCHIVO_CSV, 'utf-8');
    } catch (e) {
        console.error(`No se pudo leer el archivo: ${ARCHIVO_CSV}`);
        console.error(`Motivo: ${e.message}`);
        console.error('Si el archivo esta abierto en Excel, cerrarlo y volver a ejecutar.');
        process.exitCode = 1;
        return;
    }

    const registros = parsearCsv(contenido);
    if (!registros.length) {
        console.error('El archivo CSV esta vacio.');
        process.exitCode = 1;
        return;
    }

    let headerIdx = -1;
    let cols = null;

    for (let i = 0; i < Math.min(registros.length, 25); i++) {
        const fila = registros[i];
        const colCodigo = fila.findIndex((v) => {
            const u = v.toUpperCase();
            return u === 'CODIGO' || u === 'CÓDIGO' || u === 'COD';
        });
        const colDesc = fila.findIndex((v) => v.toUpperCase().includes('DESCRIPCI'));
        if (colCodigo !== -1 && colDesc !== -1) {
            const colCant = fila.findIndex((v) => v.toUpperCase().includes('CANTID'));
            const colCosto = [], colMayor = [], colDocena = [], colUnidad = [];
            fila.forEach((v, j) => {
                const u = v.toUpperCase();
                if (u.includes('COSTO UNITARI') || u === 'COSTO') colCosto.push(j);
                if (u.includes('MAYOR')) colMayor.push(j);
                if (u.includes('DOCENA')) colDocena.push(j);
                if (u.includes('UNIDAD')) colUnidad.push(j);
            });
            cols = {
                colCodigo, colDesc, colCant,
                normal: { costo: colCosto[0], mayor: colMayor[0], docena: colDocena[0], unidad: colUnidad[0] },
                dist: { costo: colCosto[1], mayor: colMayor[1], docena: colDocena[1], unidad: colUnidad[1] },
            };
            headerIdx = i;
            break;
        }
    }

    if (headerIdx === -1 || !cols) {
        console.error('No se pudo identificar la cabecera en el archivo CSV.');
        process.exitCode = 1;
        return;
    }

    if (cols.normal.costo === undefined || cols.normal.unidad === undefined) {
        console.error('No se encontraron las columnas de precios normales en la cabecera.');
        process.exitCode = 1;
        return;
    }

    let almacenPrincipal = await prisma.almacen.findFirst({ where: { codigo: 'ALM-01' } });
    if (!almacenPrincipal) {
        almacenPrincipal = await prisma.almacen.create({
            data: { codigo: 'ALM-01', nombre: 'Almacen Principal', ubicacion: 'General', activo: true },
        });
    }

    const consolidados = new Map();
    const catCache = new Map();
    const errores = [];
    let creados = 0;
    let actualizados = 0;
    let fallidos = 0;
    let omitidos = 0;
    let ignoradas = 0;
    let fusionadas = 0;
    let categoriasCreadas = 0;

    for (let r = headerIdx + 1; r < registros.length; r++) {
        const fila = registros[r];

        const codigo = valorEn(fila, cols.colCodigo).toUpperCase();
        if (!codigo || codigo.length < 2 || codigo.includes('TOTAL')) {
            ignoradas++;
            continue;
        }

        if (cols.colCant === -1 || fila.length <= Math.max(cols.colDesc, cols.colCant)) {
            omitidos++;
            if (errores.length < 50) errores.push(`Fila ${r + 1} (${codigo}): solo ${fila.length} campos`);
            continue;
        }

        const descripcion = valorEn(fila, cols.colDesc) || 'Sin descripcion';
        const cantidad = Math.round(aNumero(valorEn(fila, cols.colCant)));
        const costoNormal = aNumero(valorEn(fila, cols.normal.costo));
        const precioMayorNorm = aNumero(valorEn(fila, cols.normal.mayor));
        const precioDocNorm = aNumero(valorEn(fila, cols.normal.docena));
        const precioUniNorm = aNumero(valorEn(fila, cols.normal.unidad));
        const costoDist = aNumero(valorEn(fila, cols.dist.costo));
        const precioMayorDist = aNumero(valorEn(fila, cols.dist.mayor));
        const precioDocDist = aNumero(valorEn(fila, cols.dist.docena));
        const precioUniDist = aNumero(valorEn(fila, cols.dist.unidad));
        const hayBloqueDist = cols.dist.costo !== undefined && cols.dist.unidad !== undefined;

        const nombreCategoria = extraerCategoria(descripcion);
        const presentacion = extraerPresentacion(descripcion);
        const tipoFlor = extraerTipoFlor(descripcion);
        const composicion = extraerComposicion(descripcion);
        const follaje = extraerFollaje(descripcion);
        const numCabezas = extraerCabezas(descripcion);
        const dimensiones = extraerDimensiones(descripcion);
        const imagenUrl = buscarImagen(codigo);

        const previo = consolidados.get(codigo);
        const acumulada = (previo ? previo.cantidadAcumulada : 0) + cantidad;
        const datos = {
            codigo,
            descripcion,
            nombreCategoria,
            presentacion,
            tipoFlor,
            composicion,
            follaje,
            numCabezas,
            dimensiones,
            imagenUrl,
            costoNormal,
            precioMayorNorm,
            precioDocNorm,
            precioUniNorm,
            costoDist,
            precioMayorDist,
            precioDocDist,
            precioUniDist,
            hayBloqueDist,
            cantidadAcumulada: acumulada,
        };
        if (previo) {
            Object.assign(previo, datos);
            fusionadas++;
        } else {
            consolidados.set(codigo, datos);
        }
    }

    console.log(`Consolidacion: ${consolidados.size} codigos unicos (${fusionadas} filas fusionadas por duplicado)\n`);

    let procesadas = 0;
    for (const item of consolidados.values()) {
        const {
            codigo, descripcion, nombreCategoria, presentacion, tipoFlor, composicion,
            follaje, numCabezas, dimensiones, imagenUrl, costoNormal, precioMayorNorm,
            precioDocNorm, precioUniNorm, costoDist, precioMayorDist, precioDocDist,
            precioUniDist, hayBloqueDist,
        } = item;
        const cantidad = item.cantidadAcumulada;

        const preciosNormalData = {
            costo_normal: costoNormal,
            precio_mayor_normal: precioMayorNorm,
            precio_docena_normal: precioDocNorm,
            precio_unidad_normal: precioUniNorm,
        };
        const preciosDistData = hayBloqueDist ? {
            costo_distribuidor: costoDist,
            precio_mayor_dist: precioMayorDist,
            precio_docena_dist: precioDocDist,
            precio_unidad_dist: precioUniDist,
        } : {};

        try {
            await prisma.$transaction(async (tx) => {
                let catObj = catCache.get(nombreCategoria);
                if (!catObj) {
                    catObj = await tx.categoria.findFirst({
                        where: { nombre_categoria: nombreCategoria },
                    });
                    if (!catObj) {
                        catObj = await tx.categoria.create({
                            data: { nombre_categoria: nombreCategoria },
                        });
                        categoriasCreadas++;
                    }
                    catCache.set(nombreCategoria, catObj);
                }

                const productoExistente = await tx.producto.findUnique({
                    where: { codigo: codigo },
                });

                if (!productoExistente) {
                    const nuevoProducto = await tx.producto.create({
                        data: {
                            codigo: codigo,
                            descripcion: descripcion,
                            id_categoria: catObj.id_categoria,
                            presentacion: presentacion,
                            tipo_flor: tipoFlor,
                            composicion: composicion,
                            follaje: follaje,
                            numero_cabezas: numCabezas,
                            tamano: dimensiones,
                            foto_url: imagenUrl,
                            stock_principal: cantidad,
                            stock_total: cantidad,
                            activo: true,
                        },
                    });

                    await tx.preciosActuales.create({
                        data: {
                            id_producto: nuevoProducto.id_producto,
                            ...preciosNormalData,
                            ...preciosDistData,
                        },
                    });

                    await tx.stockActual.create({
                        data: {
                            id_producto: nuevoProducto.id_producto,
                            id_almacen: almacenPrincipal.id_almacen,
                            cantidad: cantidad,
                        },
                    });

                    creados++;
                } else {
                    await tx.producto.update({
                        where: { id_producto: productoExistente.id_producto },
                        data: {
                            descripcion: descripcion,
                            id_categoria: catObj.id_categoria,
                            presentacion: presentacion || productoExistente.presentacion,
                            tipo_flor: tipoFlor || productoExistente.tipo_flor,
                            composicion: composicion || productoExistente.composicion,
                            follaje: follaje || productoExistente.follaje,
                            numero_cabezas: numCabezas !== null ? numCabezas : productoExistente.numero_cabezas,
                            tamano: dimensiones || productoExistente.tamano,
                            foto_url: imagenUrl || productoExistente.foto_url,
                            stock_principal: cantidad,
                            stock_total: cantidad,
                        },
                    });

                    await tx.preciosActuales.upsert({
                        where: { id_producto: productoExistente.id_producto },
                        update: {
                            costo_normal: costoNormal > 0 ? costoNormal : undefined,
                            precio_mayor_normal: precioMayorNorm > 0 ? precioMayorNorm : undefined,
                            precio_docena_normal: precioDocNorm > 0 ? precioDocNorm : undefined,
                            precio_unidad_normal: precioUniNorm > 0 ? precioUniNorm : undefined,
                            costo_distribuidor: hayBloqueDist && costoDist > 0 ? costoDist : undefined,
                            precio_mayor_dist: hayBloqueDist && precioMayorDist > 0 ? precioMayorDist : undefined,
                            precio_docena_dist: hayBloqueDist && precioDocDist > 0 ? precioDocDist : undefined,
                            precio_unidad_dist: hayBloqueDist && precioUniDist > 0 ? precioUniDist : undefined,
                        },
                        create: {
                            id_producto: productoExistente.id_producto,
                            ...preciosNormalData,
                            ...preciosDistData,
                        },
                    });

                    await tx.stockActual.upsert({
                        where: {
                            id_producto_id_almacen: {
                                id_producto: productoExistente.id_producto,
                                id_almacen: almacenPrincipal.id_almacen,
                            },
                        },
                        update: { cantidad: cantidad },
                        create: {
                            id_producto: productoExistente.id_producto,
                            id_almacen: almacenPrincipal.id_almacen,
                            cantidad: cantidad,
                        },
                    });

                    actualizados++;
                }
            });
        } catch (error) {
            fallidos++;
            if (errores.length < 50) errores.push(`${codigo}: ${error.message}`);
        }

        procesadas++;
        if (procesadas % 100 === 0) {
            console.log(`  ${procesadas} productos procesados... (creados ${creados}, actualizados ${actualizados}, fallidos ${fallidos})`);
        }
    }

    const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log('\n========================================');
    console.log('Proceso finalizado correctamente.');
    console.log(`Productos Creados: ${creados}`);
    console.log(`Productos Actualizados: ${actualizados}`);
    console.log(`Codigos unicos consolidados: ${consolidados.size}`);
    console.log(`Filas fusionadas por codigo duplicado: ${fusionadas}`);
    console.log(`Categorias nuevas: ${categoriasCreadas}`);
    console.log(`Filas omitidas por campos insuficientes: ${omitidos}`);
    console.log(`Filas ignoradas (sin codigo o TOTAL): ${ignoradas}`);
    console.log(`Filas fallidas: ${fallidos}`);
    console.log(`Tiempo: ${segundos}s`);
    if (errores.length) {
        console.log('\nDetalle de errores/omisiones:');
        errores.forEach((e) => console.log(`  - ${e}`));
        if (fallidos > errores.length) console.log(`  ... y ${fallidos - errores.length} errores mas`);
    }
    console.log('========================================\n');
    if (fallidos > 0) process.exitCode = 1;
}

main()
    .catch((e) => { console.error('Error:', e); process.exitCode = 1; })
    .finally(async () => await prisma.$disconnect());
