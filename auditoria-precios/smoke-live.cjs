const {PrismaClient}=require('/app/apps/api/node_modules/@prisma/client');
const jwt=require('/app/apps/api/node_modules/jsonwebtoken');
(async()=>{const db=new PrismaClient();try{
 const actor=await db.usuario.findFirstOrThrow({where:{rol:'admin',activo:true,deleted_at:null},select:{id_usuario:true,session_version:true}});
 const token=jwt.sign(actor,process.env.JWT_SECRET,{expiresIn:'2m'});
 const out=[];
 for(const path of ['/auth/me','/precios?page=1&limit=8','/historial-precios?limit=1','/precios/categorias?limit=20']){
 const r=await fetch('http://127.0.0.1:3001/api'+path,{headers:{Authorization:'Bearer '+token}});
 const data=await r.json();out.push({path,status:r.status,total:data.total,rows:Array.isArray(data.data)?data.data.length:undefined});}
 console.log(JSON.stringify(out,null,2));if(out.some(r=>r.status!==200))process.exitCode=1;
 }finally{await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1});
