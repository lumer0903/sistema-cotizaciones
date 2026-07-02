const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const BRAND = '#8B1D1D';
const GOLD = '#F3B600';
const TEXT = '#27272A';
const MUTED = '#71717A';
const BORDER = '#E5E7EB';
// Ajusta esta ruta si tu estructura de carpetas es distinta a la del proyecto original.
const LOGO_PATH = path.resolve(__dirname, '../assets/icon.png');

// Rutas de la fuente DM Sans (descargada de Google Fonts, instancias estáticas
// generadas a partir de la variable font: pesos 400/500/700).
// Copia los .ttf adjuntos a esta ruta dentro de tu proyecto backend.
const FONT_REGULAR = path.resolve(__dirname, '../../../frontend/assets/fonts/DMSans-Regular.ttf');
const FONT_MEDIUM = path.resolve(__dirname, '../../../frontend/assets/fonts/DMSans-Medium.ttf');
const FONT_BOLD = path.resolve(__dirname, '../../../frontend/assets/fonts/DMSans-Bold.ttf');

const FONT_NAME = 'DM Sans';
const FONT_NAME_MEDIUM = 'DM Sans Medium';
const FONT_NAME_BOLD = 'DM Sans Bold';

function registerFonts(doc) {
    if (fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD)) {
        doc.registerFont(FONT_NAME, FONT_REGULAR);
        doc.registerFont(FONT_NAME_BOLD, FONT_BOLD);
        doc.registerFont(FONT_NAME_MEDIUM, fs.existsSync(FONT_MEDIUM) ? FONT_MEDIUM : FONT_REGULAR);
    } else {
        // Fallback para no romper la generación si la fuente aún no está disponible en el servidor
        doc.registerFont(FONT_NAME, 'Helvetica');
        doc.registerFont(FONT_NAME_BOLD, 'Helvetica-Bold');
        doc.registerFont(FONT_NAME_MEDIUM, 'Helvetica-Bold');
    }
}

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

function etiquetaTipo(tipo) {
    const labels = {
        unidad: 'Unidad',
        docena: 'Docena',
        mayor: 'Mayor'
    };
    return labels[tipo] || tipo || '-';
}

function drawLogo(doc, x, y) {
    const width = 128;
    const height = 58;

    if (fs.existsSync(LOGO_PATH)) {
        doc.save();
        doc.roundedRect(x, y, width, height, 8).clip();
        doc.image(LOGO_PATH, x, y, { fit: [width, height], align: 'center', valign: 'center' });
        doc.restore();
        doc.roundedRect(x, y, width, height, 8).lineWidth(1.5).strokeColor('#FFFFFF').stroke();
        return;
    }

    doc.fillColor('#FFFFFF').font(FONT_NAME_BOLD).fontSize(18).text('Artes & Flores', x, y + 8);
    doc.font(FONT_NAME).fontSize(9).text('Decoraciones', x, y + 32);
}

function drawLabelValue(doc, label, value, x, y, width) {
    doc.fillColor(MUTED).font(FONT_NAME_BOLD).fontSize(8).text(label.toUpperCase(), x, y, { width });
    doc.fillColor(TEXT).font(FONT_NAME).fontSize(10).text(textOrDash(value), x, y + 13, { width });
}

function drawSectionCard(doc, x, y, width, height, title) {
    doc.roundedRect(x, y, width, height, 8).strokeColor(BORDER).lineWidth(1).stroke();
    doc.fillColor(BRAND).font(FONT_NAME_BOLD).fontSize(9).text(title.toUpperCase(), x + 14, y + 13);
}

function drawTableHeader(doc, y) {
    doc.roundedRect(40, y, 515, 30, 6).fill('#F4F4F5');
    doc.fillColor(BRAND).font(FONT_NAME_BOLD).fontSize(8.5);
    doc.text('CODIGO', 52, y + 10, { width: 150 });
    doc.text('TIPO', 230, y + 10, { width: 110, align: 'center' });
    doc.text('CANT.', 360, y + 10, { width: 90, align: 'center' });
    doc.text('SUBTOTAL', 465, y + 10, { width: 78, align: 'right' });
    return y + 30;
}

function ensureSpace(doc, y, needed) {
    if (y + needed <= 735) return y;
    doc.addPage();
    return drawTableHeader(doc, 48);
}

function generarCotizacionPdf(cotizacion) {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    registerFonts(doc);

    doc.rect(0, 0, 595, 104).fill(BRAND);
    drawLogo(doc, 40, 24);
    doc.fillColor('#FFFFFF').font(FONT_NAME_BOLD).fontSize(20).text('COTIZACION', 360, 26, { width: 195, align: 'right' });
    doc.font(FONT_NAME).fontSize(10).text(cotizacion.numero, 360, 52, { width: 195, align: 'right' });
    doc.fillColor(GOLD).font(FONT_NAME_BOLD).fontSize(8).text('ARTES & FLORES DECORACIONES', 360, 70, { width: 195, align: 'right' });

    drawSectionCard(doc, 40, 128, 245, 92, 'Datos de la cotizacion');
    drawLabelValue(doc, 'Numero', cotizacion.numero, 56, 154, 95);
    drawLabelValue(doc, 'Fecha', fecha(cotizacion.created_at), 170, 154, 90);
    drawLabelValue(doc, 'Estado', labelEstado(cotizacion.estado), 56, 188, 120);

    drawSectionCard(doc, 310, 128, 245, 92, 'Cliente');
    drawLabelValue(doc, 'Nombre', cotizacion.cliente_nombre, 326, 154, 205);
    drawLabelValue(doc, 'Email', cotizacion.email, 326, 188, 112);
    drawLabelValue(doc, 'Telefono', cotizacion.telefono, 448, 188, 82);

    let y = 250;
    doc.fillColor(TEXT).font(FONT_NAME_BOLD).fontSize(12).text('Productos cotizados', 40, y);
    y += 22;
    y = drawTableHeader(doc, y);

    if (!cotizacion.detalle.length) {
        doc.fillColor(MUTED).font(FONT_NAME).fontSize(10).text('Sin productos agregados', 52, y + 12, { width: 490 });
        y += 40;
    }

    const ROW_HEIGHT = 32;

    cotizacion.detalle.forEach((item, index) => {
        y = ensureSpace(doc, y, ROW_HEIGHT + 4);

        if (index % 2 !== 0) {
            doc.roundedRect(40, y, 515, ROW_HEIGHT, 5).fill('#FAFAFA');
        }

        doc.fillColor(TEXT).font(FONT_NAME_BOLD).fontSize(9).text(item.codigo || '-', 52, y + 11, { width: 150 });
        doc.fillColor(TEXT).font(FONT_NAME).fontSize(9);
        doc.text(etiquetaTipo(item.tipo_venta), 230, y + 11, { width: 110, align: 'center' });
        doc.text(String(item.cantidad || 0), 360, y + 11, { width: 90, align: 'center' });
        doc.font(FONT_NAME_BOLD).text(moneda(item.subtotal), 465, y + 11, { width: 78, align: 'right' });
        doc.moveTo(40, y + ROW_HEIGHT).lineTo(555, y + ROW_HEIGHT).strokeColor(BORDER).lineWidth(0.7).stroke();
        y += ROW_HEIGHT;
    });

    y = ensureSpace(doc, y + 18, 128);
    const totalsX = 354;
    const totalsWidth = 201;
    const totalsHeight = Number(cotizacion.incluye_carreta) ? 126 : 106;
    doc.roundedRect(totalsX, y, totalsWidth, totalsHeight, 8).fill('#FAFAFA').strokeColor(BORDER).stroke();
    doc.fillColor(BRAND).font(FONT_NAME_BOLD).fontSize(10).text('RESUMEN', totalsX + 16, y + 14);

    let ty = y + 38;
    doc.fillColor(TEXT).font(FONT_NAME).fontSize(9);
    doc.text('Subtotal', totalsX + 16, ty, { width: 84 });
    doc.text(moneda(cotizacion.subtotal), totalsX + 100, ty, { width: 82, align: 'right' });
    ty += 18;
    doc.text('IGV (18%)', totalsX + 16, ty, { width: 84 });
    doc.text(moneda(cotizacion.igv), totalsX + 100, ty, { width: 82, align: 'right' });
    ty += 18;
    if (Number(cotizacion.incluye_carreta)) {
        doc.text('Carreta', totalsX + 16, ty, { width: 84 });
        doc.text(moneda(cotizacion.costo_carreta), totalsX + 100, ty, { width: 82, align: 'right' });
        ty += 18;
    }
    doc.moveTo(totalsX + 16, ty + 4).lineTo(totalsX + totalsWidth - 16, ty + 4).strokeColor(BORDER).stroke();
    ty += 16;
    doc.fillColor(BRAND).font(FONT_NAME_BOLD).fontSize(12);
    doc.text('TOTAL', totalsX + 16, ty, { width: 84 });
    doc.text(moneda(cotizacion.total), totalsX + 100, ty, { width: 82, align: 'right' });

    if (cotizacion.observaciones) {
        const obsY = ensureSpace(doc, y, 76);
        doc.fillColor(TEXT).font(FONT_NAME_BOLD).fontSize(11).text('Observaciones', 40, obsY);
        doc.roundedRect(40, obsY + 18, 285, 58, 8).strokeColor(BORDER).stroke();
        doc.fillColor(MUTED).font(FONT_NAME).fontSize(9).text(cotizacion.observaciones, 54, obsY + 32, { width: 257, height: 34 });
    }

    doc.font(FONT_NAME).fontSize(8).fillColor(MUTED)
        .text('Gracias por confiar en Artes & Flores Decoraciones.', 40, 780, { width: 515, align: 'center', lineBreak: false });

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

module.exports = {
    generarCotizacionPdf
};