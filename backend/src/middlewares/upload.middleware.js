const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// ✅ Validar que sea Excel
const fileFilter = (req, file, cb) => {
    const extensionesPermitidas = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (extensionesPermitidas.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // ✅ Máximo 10MB
});

module.exports = upload;