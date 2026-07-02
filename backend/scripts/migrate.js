const db = require('../src/config/db');

async function columnExists(table, column) {
    const [rows] = await db.query(
        `SELECT 1
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?
         LIMIT 1`,
        [table, column]
    );
    return rows.length > 0;
}

async function indexExists(table, indexName) {
    const [rows] = await db.query(
        `SELECT 1
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND INDEX_NAME = ?
         LIMIT 1`,
        [table, indexName]
    );
    return rows.length > 0;
}

async function addColumn(table, column, ddl) {
    if (await columnExists(table, column)) return;
    await db.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    console.log(`Migracion aplicada: ${table}.${column}`);
}

async function addIndex(table, indexName, ddl) {
    if (await indexExists(table, indexName)) return;
    await db.query(`ALTER TABLE ${table} ADD ${ddl}`);
    console.log(`Migracion aplicada: ${table}.${indexName}`);
}

async function migrate() {
    await addColumn('productos', 'stock_minimo', 'stock_minimo INT DEFAULT 10');
    await db.query("ALTER TABLE usuarios MODIFY rol enum('admin','gerente','vendedor') DEFAULT 'vendedor'");
    await addColumn('cotizaciones', 'incluye_carreta', 'incluye_carreta TINYINT(1) NOT NULL DEFAULT 1');
    await addColumn('cotizaciones', 'costo_carreta', 'costo_carreta DECIMAL(10,2) NOT NULL DEFAULT 15.00');
    await addIndex('cotizaciones', 'uq_cotizaciones_numero', 'UNIQUE KEY uq_cotizaciones_numero (numero)');
}

migrate()
    .then(() => {
        console.log('Migraciones completadas');
        process.exit(0);
    })
    .catch((error) => {
        console.error('No se pudieron completar las migraciones:', error.message);
        process.exit(1);
    });
