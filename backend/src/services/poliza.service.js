const XLSX = require('xlsx');
const db = require('../config/db');

const procesarPoliza = async (filePath, modoPrueba = false) => {
    const workbook = XLSX.readFile(filePath);
    const sheets = workbook.SheetNames;
    const resumen = [];

    console.log("Hojas encontradas:", sheets);

    for (const sheetName of sheets) {

        // ✅ Solo procesar hojas POLIZA, ignorar PAKINGLIST y otras
        if (!sheetName.toUpperCase().startsWith('POLIZA')) {
            console.log(`⏭️ Saltando hoja: ${sheetName}`);
            continue;
        }

        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (data.length === 0) continue;

        // ✅ Detectar fila de encabezado automáticamente
        let filaEncabezado = 0;
        for (let i = 0; i < data.length; i++) {
            const valores = Object.values(data[i]).map(v => v?.toString().toUpperCase());
            if (valores.some(v => v?.includes('CODIGO'))) {
                filaEncabezado = i;
                break;
            }
        }

        const datosReales = data.slice(filaEncabezado + 1);
        console.log(`📋 Hoja: ${sheetName} → ${datosReales.length} productos encontrados`);

        for (const row of datosReales) {
            const codigo = row['CODIGO']?.toString().trim().toUpperCase();
            if (!codigo) continue;

            const descripcion = row['DESCRIPCION']?.toString().trim() || '';
            const cantidad = parseInt(row['CANTIDAD (UND)'] || 0);
            const costo_normal = parseFloat(row['costo_normal'] || 0);
            const precio_unidad_normal = parseFloat(row['precio_unidad_normal'] || 0);
            const precio_docena_normal = parseFloat(row['precio_docena_normal'] || 0);
            const precio_mayor_normal = parseFloat(row['precio_mayor_normal'] || 0);
            const costo_dist = parseFloat(row['costo_distribuidor'] || 0);
            const precio_unidad_dist = parseFloat(row['precio_unidad_dist'] || 0);
            const precio_docena_dist = parseFloat(row['precio_docena_dist'] || 0);
            const precio_mayor_dist = parseFloat(row['precio_mayor_dist'] || 0);

            // ✅ Agregar al resumen siempre
            resumen.push({
                hoja: sheetName,
                codigo,
                descripcion,
                cantidad
            });

            // ✅ Si es modo prueba, no tocar la BD
            if (modoPrueba) continue;

            // 🗄️ Procesar en la BD
            try {
                const [productos] = await db.query(
                    "SELECT * FROM productos WHERE codigo = ?",
                    [codigo]
                );

                let id_producto;

                if (productos.length > 0) {
                    id_producto = productos[0].id_producto;
                    await db.query(
                        "UPDATE productos SET stock_total = stock_total + ? WHERE id_producto = ?",
                        [cantidad, id_producto]
                    );
                } else {
                    const [result] = await db.query(
                        `INSERT INTO productos 
                        (codigo, descripcion, stock_total, id_categoria, activo)
                        VALUES (?, ?, ?, NULL, 1)`,
                        [codigo, descripcion, cantidad]
                    );
                    id_producto = result.insertId;
                }

                const [precios] = await db.query(
                    "SELECT * FROM precios_actuales WHERE id_producto = ?",
                    [id_producto]
                );

                if (precios.length > 0) {
                    const prev = precios[0];

                    // Registrar historial de precios que cambien
                    const campos = [
                        ['precio_unidad_normal', prev.precio_unidad_normal, precio_unidad_normal],
                        ['precio_docena_normal', prev.precio_docena_normal, precio_docena_normal],
                        ['precio_mayor_normal', prev.precio_mayor_normal, precio_mayor_normal],
                        ['precio_unidad_dist', prev.precio_unidad_dist, precio_unidad_dist],
                        ['precio_docena_dist', prev.precio_docena_dist, precio_docena_dist],
                        ['precio_mayor_dist', prev.precio_mayor_dist, precio_mayor_dist],
                    ];

                    for (const [campo, anterior, nuevo] of campos) {
                        if (parseFloat(anterior) !== parseFloat(nuevo)) {
                            await db.query(
                                `INSERT INTO historial_precios
                                (id_producto, id_usuario, campo_modificado, valor_anterior, valor_nuevo)
                                VALUES (?, 1, ?, ?, ?)`,
                                [id_producto, campo, anterior, nuevo]
                            );
                        }
                    }

                    await db.query(
                        `UPDATE precios_actuales SET
                            costo_normal = ?,
                            precio_unidad_normal = ?,
                            precio_docena_normal = ?,
                            precio_mayor_normal = ?,
                            costo_distribuidor = ?,
                            precio_unidad_dist = ?,
                            precio_docena_dist = ?,
                            precio_mayor_dist = ?
                        WHERE id_producto = ?`,
                        [
                            costo_normal, precio_unidad_normal,
                            precio_docena_normal, precio_mayor_normal,
                            costo_dist, precio_unidad_dist,
                            precio_docena_dist, precio_mayor_dist,
                            id_producto
                        ]
                    );

                } else {
                    await db.query(
                        `INSERT INTO precios_actuales
                        (id_producto,
                         costo_normal, precio_unidad_normal, precio_docena_normal, precio_mayor_normal,
                         costo_distribuidor, precio_unidad_dist, precio_docena_dist, precio_mayor_dist)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            id_producto,
                            costo_normal, precio_unidad_normal,
                            precio_docena_normal, precio_mayor_normal,
                            costo_dist, precio_unidad_dist,
                            precio_docena_dist, precio_mayor_dist
                        ]
                    );
                }

            } catch (error) {
                console.error("❌ Error con producto:", codigo, error.message);
            }
        }
    }

    return resumen;
};

module.exports = { procesarPoliza };
