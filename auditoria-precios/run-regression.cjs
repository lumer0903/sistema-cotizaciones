const {Client}=require('/app/apps/api/node_modules/pg');
const {spawnSync}=require('node:child_process');
(async()=>{
 const name='pricing_qa_'+Date.now();
 const admin=new Client({connectionString:process.env.DATABASE_URL});
 await admin.connect();await admin.query('CREATE DATABASE '+name);
 const url=new URL(process.env.DATABASE_URL);url.pathname='/'+name;
 try {
  const env={...process.env,DATABASE_URL:url.toString(),PRICING_QA_DATABASE:name};
  for(const args of [
   ['--filter','@goldcontinent/database','exec','prisma','migrate','deploy'],
   ['NODE_TEST'],
   ['--filter','@goldcontinent/api','exec','vitest','run','src/common/utils/consistency.integration.test.ts','src/modules/inventario/inventario.integration.test.ts','--pool=threads','--poolOptions.threads.singleThread']
  ]) {
   if(process.env.PRICING_QA_FAST && args.includes('vitest'))continue;
   const r=args[0]==='NODE_TEST'?spawnSync('node',['/tmp/pricing-regression.cjs'],{cwd:'/app',env,stdio:'inherit'}):spawnSync('pnpm',args,{cwd:'/app',env,stdio:'inherit'});
   if(r.status!==0)throw new Error('Comando falló: '+r.status);
  }
 }finally{
  if(!/^pricing_qa_\d+$/.test(name))throw new Error('Nombre QA inválido');
  await admin.query('DROP DATABASE '+name+' WITH (FORCE)');await admin.end();
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
