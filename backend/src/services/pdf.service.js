const PDFDocument = require('pdfkit');

function moneda(value) {
    return `S/ ${Number(value || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function fecha(value) {
    return new Date(value || Date.now()).toLocaleDateString('es-PE');
}

function labelEstado(estado) {
    const labels = {
        borrador: 'Borrador',
        enviada: 'Enviada',
        aprobada: 'Aceptada',
        rechazada: 'Rechazada',
        vencida: 'Vencida'
    };
    return labels[estado] || estado;
}

function textOrDash(value) {
    return value || '-';
}

function agregarFila(doc, y, columns, options = {}) {
    const rowHeight = options.height || 26;
    const background = options.background;

    if (background) {
        doc.rect(40, y, 515, rowHeight).fill(background);
    }

    doc.fillColor(options.color || '#3F3F46')
        .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(options.size || 9);

    columns.forEach((column) => {
        doc.text(column.text, column.x, y + 8, {
            width: column.width,
            align: column.align || 'left'
        });
    });

    return y + rowHeight;
}

function generarCotizacionPdf(cotizacion) {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    doc.rect(0, 0, 595, 92).fill('#8B1D1D');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text('Artes & Flores', 40, 26);
    doc.font('Helvetica').fontSize(10).text('Decoraciones', 40, 50);
    doc.font('Helvetica-Bold').fontSize(16).text('COTIZACION', 390, 26, { width: 165, align: 'right' });
    doc.font('Helvetica').fontSize(10).text(cotizacion.numero, 390, 50, { width: 165, align: 'right' });

    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12).text('Datos de la cotizacion', 40, 118);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Fecha: ${fecha(cotizacion.created_at)}`, 40, 140);
    doc.text(`Estado: ${labelEstado(cotizacion.estado)}`, 40, 156);

    doc.font('Helvetica-Bold').fontSize(12).text('Cliente', 320, 118);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Nombre: ${textOrDash(cotizacion.cliente_nombre)}`, 320, 140, { width: 230 });
    doc.text(`Email: ${textOrDash(cotizacion.email)}`, 320, 156, { width: 230 });
    doc.text(`Telefono: ${textOrDash(cotizacion.telefono)}`, 320, 172, { width: 230 });
    doc.text(`Documento: ${textOrDash(cotizacion.ruc_dni)}`, 320, 188, { width: 230 });

    let y = 230;
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12).text('Productos', 40, y);
    y += 22;

    y = agregarFila(doc, y, [
        { text: 'Codigo', x: 48, width: 130 },
        { text: 'Tipo', x: 205, width: 80, align: 'center' },
        { text: 'Cant.', x: 300, width: 55, align: 'center' },
        { text: 'P. Unit.', x: 375, width: 80, align: 'right' },
        { text: 'Subtotal', x: 475, width: 80, align: 'right' }
    ], { background: '#F4F4F5', color: '#8B1D1D', bold: true, height: 30 });

    if (!cotizacion.detalle.length) {
        y = agregarFila(doc, y, [
            { text: 'Sin productos agregados', x: 48, width: 490 }
        ], { height: 34 });
    }

    cotizacion.detalle.forEach((item, index) => {
        if (y > 705) {
            doc.addPage();
            y = 48;
        }

        const fill = index % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
        y = agregarFila(doc, y, [
            { text: item.codigo, x: 48, width: 130 },
            { text: item.tipo_venta, x: 205, width: 80, align: 'center' },
            { text: String(item.cantidad), x: 300, width: 55, align: 'center' },
            { text: moneda(item.precio_unitario), x: 375, width: 80, align: 'right' },
            { text: moneda(item.subtotal), x: 475, width: 80, align: 'right' }
        ], { background: fill, height: 32 });
    });

    y += 18;
    const totalsX = 365;
    doc.font('Helvetica').fontSize(10).fillColor('#3F3F46');
    doc.text('Subtotal:', totalsX, y, { width: 90, align: 'right' });
    doc.text(moneda(cotizacion.subtotal), 465, y, { width: 90, align: 'right' });
    y += 18;
    doc.text('IGV (18%):', totalsX, y, { width: 90, align: 'right' });
    doc.text(moneda(cotizacion.igv), 465, y, { width: 90, align: 'right' });
    y += 20;
    doc.fillColor('#8B1D1D').font('Helvetica-Bold').fontSize(13);
    doc.text('TOTAL:', totalsX, y, { width: 90, align: 'right' });
    doc.text(moneda(cotizacion.total), 465, y, { width: 90, align: 'right' });

    if (cotizacion.observaciones) {
        y += 42;
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11).text('Observaciones', 40, y);
        doc.fillColor('#3F3F46').font('Helvetica').fontSize(10).text(cotizacion.observaciones, 40, y + 18, { width: 515 });
    }

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

module.exports = {
    generarCotizacionPdf
};
