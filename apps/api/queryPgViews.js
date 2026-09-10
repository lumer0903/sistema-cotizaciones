const { Client } = require('pg');
async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/goldcontinent?schema=public' });
  await client.connect();
  const res = await client.query(`
    SELECT viewname, definition 
    FROM pg_views 
    WHERE schemaname = 'public';
  `);
  console.log('Views:', res.rows);
  const res2 = await client.query(`
    SELECT tgname, pg_get_triggerdef(oid) 
    FROM pg_trigger;
  `);
  console.log('Triggers:', res2.rows.filter(r => r.pg_get_triggerdef && r.pg_get_triggerdef.includes('existe')));
  await client.end();
}
main().catch(console.error);
