const { Client } = require('pg');
async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/goldcontinent?schema=public' });
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'usuarios';
  `);
  console.log('Columnas:', res.rows);
  await client.end();
}
main().catch(console.error);
