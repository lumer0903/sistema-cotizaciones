const db = require('../config/db');
const axios = require('axios');
const PDFDocument = require('pdfkit');
const jwt = require('jsonwebtoken'); // Movido al inicio para mayor eficiencia

// 1. CREAR COTIZACIÓN
const crearCotizacion = async (req, res) => {
    const { id_cliente, tipo_precio, observaciones } = req.body;
    const id_usuario = req.usuario.id;

    try {
        const [ultima] = await db.query(
            "SELECT numero FROM cotizaciones ORDER BY id_cotizacion DESC LIMIT 1"
        );

        let numero;
        if (ultima.length > 0) {
            const partes = ultima[0].numero.split('-');
            const siguiente = parseInt(partes[2]) + 1;
            numero = `COT-${new Date().getFullYear()}-${String(siguiente).padStart(3, '0')}`;
        } else {
            numero = `COT-${new Date().getFullYear()}-001`;
        }

        const [result] = await db.query(
            `INSERT INTO cotizaciones 
            (numero, id_cliente, id_usuario, tipo_precio, tasa_igv, estado, tiempo_inicio, observaciones)
            VALUES (?, ?, ?, ?, 18.00, 'borrador', NOW(), ?)`,
            [numero, id_cliente || null, id_usuario, tipo_precio || 'normal', observaciones || '']
        );

        res.json({
            mensaje: 'Cotización creada',
            id_cotizacion: result.insertId,
            numero
        });

    } catch (error) {
        console.error('❌ Error en crearCotizacion:', error);
        res.status(500).json({ error: 'Error al crear cotización' });
    }
};

// 2. OBTENER TODAS LAS COTIZACIONES
const obtenerCotizaciones = async (req, res) => {
    try {
        const [cotizaciones] = await db.query(`
            SELECT 
                c.*,
                cl.nombre AS nombre_cliente,
                u.nombre AS nombre_usuario
            FROM cotizaciones c
            LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
            JOIN usuarios u ON c.id_usuario = u.id_usuario
            ORDER BY c.created_at DESC
        `);
        res.json(cotizaciones);
    } catch (error) {
        console.error('❌ Error en obtenerCotizaciones:', error);
        res.status(500).json({ error: 'Error al obtener cotizaciones' });
    }
};

// 3. OBTENER COTIZACIÓN POR ID
const obtenerCotizacion = async (req, res) => {
    const { id } = req.params;
    try {
        const [cotizacion] = await db.query(`
            SELECT c.*, cl.nombre AS nombre_cliente, u.nombre AS nombre_usuario
            FROM cotizaciones c
            LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
            JOIN usuarios u ON c.id_usuario = u.id_usuario
            WHERE c.id_cotizacion = ?
        `, [id]);

        if (cotizacion.length === 0) {
            return res.status(404).json({ error: 'Cotización no encontrada' });
        }

        const [detalle] = await db.query(`
            SELECT 
                cd.*,
                p.codigo,
                p.descripcion,
                p.foto_url
            FROM cotizacion_detalle cd
            JOIN productos p ON cd.id_producto = p.id_producto
            WHERE cd.id_cotizacion = ?
        `, [id]);

        res.json({ ...cotizacion[0], detalle });

    } catch (error) {
        console.error('❌ Error en obtenerCotizacion:', error);
        res.status(500).json({ error: 'Error al obtener cotización' });
    }
};

// 4. AGREGAR PRODUCTO A COTIZACIÓN
const agregarProducto = async (req, res) => {
    const { id } = req.params;
    const { id_producto, tipo_venta, cantidad, precio_unitario, es_sugerido_ia } = req.body;

    try {
        const [cotizacion] = await db.query(
            "SELECT tipo_precio FROM cotizaciones WHERE id_cotizacion = ?", [id]
        );

        if (cotizacion.length === 0) {
            return res.status(404).json({ error: 'Cotización no encontrada' });
        }

        let precio_final = precio_unitario;

        if (!precio_final) {
            const tipo = cotizacion[0].tipo_precio;
            const [precios] = await db.query(
                "SELECT * FROM precios_actuales WHERE id_producto = ?", [id_producto]
            );
            if (precios.length === 0) {
                return res.status(404).json({ error: 'Producto sin precios' });
            }
            const p = precios[0];
            if (tipo_venta === 'unidad') precio_final = tipo === 'normal' ? p.precio_unitario_normal : p.precio_unitario_dist;
            else if (tipo_venta === 'docena') precio_final = tipo === 'normal' ? p.precio_docena_normal : p.precio_docena_dist;
            else if (tipo_venta === 'mayor') precio_final = tipo === 'normal' ? p.precio_mayor_normal : p.precio_mayor_dist;
        }

        const subtotal = precio_final * cantidad;

        await db.query(
            `INSERT INTO cotizacion_detalle
            (id_cotizacion, id_producto, tipo_venta, cantidad, precio_unitario, subtotal, es_sugerido_ia)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, id_producto, tipo_venta, cantidad, precio_final, subtotal, es_sugerido_ia || false]
        );

        await recalcularTotales(id);
        res.json({ mensaje: 'Producto agregado', precio_unitario: precio_final, subtotal });

    } catch (error) {
        console.error('❌ Error en agregarProducto:', error);
        res.status(500).json({ error: 'Error al agregar producto' });
    }
};

const editarProducto = async (req, res) => {
    const { id, id_detalle } = req.params;
    const { tipo_venta, cantidad, precio_unitario } = req.body;

    try {
        const subtotal = precio_unitario * cantidad;

        await db.query(
            `UPDATE cotizacion_detalle 
             SET tipo_venta = ?, cantidad = ?, precio_unitario = ?, subtotal = ?
             WHERE id_detalle = ? AND id_cotizacion = ?`,
            [tipo_venta, cantidad, precio_unitario, subtotal, id_detalle, id]
        );

        await recalcularTotales(id);
        res.json({ mensaje: 'Producto actualizado' });

    } catch (error) {
        console.error('❌ Error en editarProducto:', error);
        res.status(500).json({ error: 'Error al editar producto' });
    }
};

const eliminarProducto = async (req, res) => {
    const { id, id_detalle } = req.params;
    try {
        await db.query(
            "DELETE FROM cotizacion_detalle WHERE id_detalle = ? AND id_cotizacion = ?",
            [id_detalle, id]
        );
        await recalcularTotales(id);
        res.json({ mensaje: 'Producto eliminado' });
    } catch (error) {
        console.error('❌ Error en eliminarProducto:', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
};

const obtenerRecomendaciones = async (req, res) => {
    const { id_producto, tipo_precio } = req.body;
    try {
        const respuesta = await axios.post('http://localhost:5000/recomendar', {
            id_producto,
            tipo_precio
        });
        res.json(respuesta.data);
    } catch (error) {
        console.error('❌ Error en IA:', error.message);
        res.status(500).json({ error: 'Error al obtener recomendaciones' });
    }
};

const recalcularTotales = async (id_cotizacion) => {
    const [detalle] = await db.query(
        "SELECT SUM(subtotal) AS subtotal FROM cotizacion_detalle WHERE id_cotizacion = ?",
        [id_cotizacion]
    );
    const subtotal = parseFloat(detalle[0].subtotal || 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;

    await db.query(
        "UPDATE cotizaciones SET subtotal = ?, igv = ?, total = ? WHERE id_cotizacion = ?",
        [subtotal, igv, total, id_cotizacion]
    );
};

const actualizarInfoCotizacion = async (req, res) => {
    const { id } = req.params;
    const { id_cliente, tipo_precio, observaciones } = req.body;
    try {
        await db.query(
            `UPDATE cotizaciones SET 
                id_cliente = ?, 
                tipo_precio = ?, 
                observaciones = ?
             WHERE id_cotizacion = ?`,
            [id_cliente || null, tipo_precio, observaciones, id]
        );
        res.json({ mensaje: 'Información actualizada' });
    } catch (error) {
        console.error('❌ Error en actualizarInfoCotizacion:', error);
        res.status(500).json({ error: 'Error al actualizar información' });
    }
};

const registrarInteraccionIA = async (req, res) => {
    const { id } = req.params;
    const { id_producto, acepto_sugerencia } = req.body;

    try {
        const [existente] = await db.query(
            `SELECT * FROM ia_interacciones 
             WHERE id_cotizacion = ? AND id_producto = ?`,
            [id, id_producto]
        );

        if (existente.length > 0) {
            await db.query(
                `UPDATE ia_interacciones 
                 SET clics_ia = clics_ia + 1,
                     sugerencias_aceptadas = sugerencias_aceptadas + ?
                 WHERE id_cotizacion = ? AND id_producto = ?`,
                [acepto_sugerencia ? 1 : 0, id, id_producto]
            );
        } else {
            await db.query(
                `INSERT INTO ia_interacciones 
                 (id_cotizacion, id_producto, clics_ia, sugerencias_aceptadas)
                 VALUES (?, ?, 1, ?)`,
                [id, id_producto, acepto_sugerencia ? 1 : 0]
            );
        }

        res.json({ mensaje: 'Interacción registrada' });

    } catch (error) {
        console.error('❌ Error en registrarInteraccionIA:', error);
        res.status(500).json({ error: 'Error al registrar interacción' });
    }
};

const actualizarEstado = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    // Estados válidos: 'borrador', 'enviada', 'pagada', 'rechazada'

    try {
        // Si el cliente ya pagó o si se rechaza definitivamente, cerramos el ciclo
        if (estado === 'pagada' || estado === 'rechazada') {
            await db.query(
                `UPDATE cotizaciones 
                 SET estado = ?,
                     tiempo_fin = NOW(),
                     tiempo_generacion = TIMESTAMPDIFF(SECOND, tiempo_inicio, NOW())
                 WHERE id_cotizacion = ?`,
                [estado, id]
            );
        } else {
            // Para 'borrador' (inicial) o 'enviada' (aceptada por el cliente)
            await db.query(
                "UPDATE cotizaciones SET estado = ? WHERE id_cotizacion = ?",
                [estado, id]
            );
        }

        res.json({ mensaje: `La cotización ahora está como: ${estado.toUpperCase()}` });

    } catch (error) {
        console.error('❌ Error en actualizarEstado:', error);
        res.status(500).json({ error: 'No se pudo actualizar el estado' });
    }
};

// ==========================================
// GENERACIÓN DE PDF (CORREGIDO)
// ==========================================
const generarPDF = async (req, res) => {
    const { id } = req.params;

    // 1. Validar token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
    }

    try {
        // 2. Obtener datos
        const [cotizacion] = await db.query(`
            SELECT c.*, cl.nombre AS nombre_cliente, cl.telefono, cl.email, cl.ruc_dni,
                   u.nombre AS nombre_usuario
            FROM cotizaciones c
            LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
            JOIN usuarios u ON c.id_usuario = u.id_usuario
            WHERE c.id_cotizacion = ?
        `, [id]);

        if (cotizacion.length === 0) {
            return res.status(404).json({ error: 'Cotización no encontrada' });
        }

        const cot = cotizacion[0];

        const [detalle] = await db.query(`
            SELECT cd.*, p.codigo, p.descripcion
            FROM cotizacion_detalle cd
            JOIN productos p ON cd.id_producto = p.id_producto
            WHERE cd.id_cotizacion = ?
        `, [id]);

        // 3. INICIALIZAR PDF DOCUMENT (AQUÍ ESTABA EL ERROR)
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            bufferPages: true
        });

        // 4. Configurar headers y pipe ANTES de escribir
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=COT-${cot.numero}.pdf`);
        doc.pipe(res);

        // =====================
        // DISEÑO DEL PDF
        // =====================

        // ENCABEZADO
        doc.fillColor('#7B1C1C').fontSize(20).font('Helvetica-Bold').text('GOLD CONTINENT', 50, 50);
        doc.fillColor('#666666').fontSize(10).font('Helvetica')
            .text('Importaciones y Exportaciones Gold Continent EIRL', 50, 75)
            .text('RUC: 20523652525', 50, 90);

        doc.fillColor('#7B1C1C').fontSize(14).font('Helvetica-Bold').text(cot.numero, 400, 50, { align: 'right' });
        doc.fillColor('#666666')
            .fontSize(10)
        doc.fillColor('#666666')
            .fontSize(10)
            .font('Helvetica')
            .text(`Estado: ${cot.estado.toUpperCase()}`, 400, 80, { align: 'right' });

        doc.moveTo(50, 120).lineTo(545, 120).strokeColor('#7B1C1C').stroke();

        // DATOS CLIENTE
        doc.fillColor('#333333').fontSize(11).font('Helvetica-Bold').text('DATOS DEL CLIENTE', 50, 135);
        doc.fontSize(10).font('Helvetica').fillColor('#666666')
            .text(`Nombre: ${cot.nombre_cliente || 'Sin cliente registrado'}`, 50, 155);
        if (cot.telefono) doc.text(`Teléfono: ${cot.telefono}`, 50, 170);
        if (cot.email) doc.text(`Email: ${cot.email}`, 50, 185);
        if (cot.ruc_dni) doc.text(`RUC/DNI: ${cot.ruc_dni}`, 300, 155);

        doc.moveTo(50, 205).lineTo(545, 205).strokeColor('#e5e7eb').stroke();

        // TABLA PRODUCTOS
        doc.fillColor('#7B1C1C').fontSize(11).font('Helvetica-Bold').text('PRODUCTOS', 50, 220);
        const tableTop = 240;
        doc.fillColor('#7B1C1C').rect(50, tableTop, 495, 20).fill();
        doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
            .text('CÓDIGO', 55, tableTop + 6)
            .text('DESCRIPCIÓN', 120, tableTop + 6)
            .text('CANT.', 365, tableTop + 6)
            .text('P. UNIT.', 400, tableTop + 6)
            .text('SUBTOTAL', 460, tableTop + 6);

        let y = tableTop + 25;
        detalle.forEach((item, index) => {
            if (index % 2 === 0) doc.fillColor('#fef2f2').rect(50, y - 3, 495, 18).fill();
            doc.fillColor('#333333').fontSize(8).font('Helvetica')
                .text(item.codigo, 55, y)
                .text(item.descripcion?.substring(0, 45) || '', 120, y)
                .text(item.cantidad.toString(), 370, y)
                .text(`S/ ${Number(item.precio_unitario).toFixed(2)}`, 395, y)
                .text(`S/ ${Number(item.subtotal).toFixed(2)}`, 455, y);
            y += 20;
        });

        // TOTALES
        y += 15;
        doc.fillColor('#666666').fontSize(10).font('Helvetica')
            .text('Subtotal:', 380, y).text(`S/ ${Number(cot.subtotal).toFixed(2)}`, 460, y);
        y += 18;
        doc.text('IGV (18%):', 380, y).text(`S/ ${Number(cot.igv).toFixed(2)}`, 460, y);
        y += 18;
        doc.fillColor('#7B1C1C').font('Helvetica-Bold').fontSize(12)
            .text('TOTAL:', 380, y).text(`S/ ${Number(cot.total).toFixed(2)}`, 460, y);

        if (cot.observaciones) {
            y += 35;
            doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold').text('OBSERVACIONES:', 50, y);
            doc.font('Helvetica').fillColor('#666666').text(cot.observaciones, 50, y + 15);
        }

        // Finalizar
        doc.end();

    } catch (error) {
        console.error('❌ Error en generarPDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error al generar PDF' });
        }
    }
};

module.exports = {
    crearCotizacion,
    obtenerCotizaciones,
    obtenerCotizacion,
    agregarProducto,
    editarProducto,
    eliminarProducto,
    actualizarEstado,
    actualizarInfoCotizacion,
    obtenerRecomendaciones,
    registrarInteraccionIA,
    generarPDF
};