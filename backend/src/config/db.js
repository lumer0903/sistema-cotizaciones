const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'goldcontinent',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4'
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error conectando a la BD:', err.message);
        return;
    }

    console.log('Conexion a MySQL exitosa');
    connection.release();
});

module.exports = pool.promise();
