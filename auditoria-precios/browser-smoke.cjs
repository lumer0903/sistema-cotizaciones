const {PrismaClient}=require('/app/apps/api/node_modules/@prisma/client');
const jwt=require('/app/apps/api/node_modules/jsonwebtoken');
const puppeteer=require('/app/apps/api/node_modules/puppeteer');
(async()=>{const db=new PrismaClient();let browser;try{
 const actor=await db.usuario.findFirstOrThrow({where:{rol:'admin',activo:true,deleted_at:null},select:{id_usuario:true,session_version:true,rol:true}});
 const token=jwt.sign(actor,process.env.JWT_SECRET,{expiresIn:'5m'});
 browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
 const page=await browser.newPage();await page.setViewport({width:1440,height:1050});
 const errors=[],requests=[],responses=[],failed=[],consoleErrors=[];page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('requestfailed',r=>failed.push({url:r.url().split('?')[0],error:r.failure()?.errorText}));page.on('response',r=>{if(r.url().includes('/api/'))responses.push({path:r.url().split('/api/')[1],status:r.status()});});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/precios?'))requests.push(r.url().split('/api/')[1]);});
 await page.setCookie({name:'accessToken',value:token,url:'http://web:3000',httpOnly:true},{name:'userRole',value:'admin',url:'http://web:3000'});
 await page.goto('http://web:3000/precios',{waitUntil:'domcontentloaded',timeout:60000});
 try{await page.waitForSelector('[aria-label^="Ver historial de precios de"]',{timeout:30000});}catch(e){await page.screenshot({path:'/tmp/precios-error.png',fullPage:true});console.log(JSON.stringify({url:page.url(),body:await page.evaluate(()=>document.body.innerText.slice(0,3000)),errors,requests,responses,failed},null,2));throw e;}
 await page.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.screenshot({path:'/tmp/precios-corregidos.png',fullPage:true});
 await page.click('[aria-label^="Ver historial de precios de"]');
 await page.waitForFunction(()=>document.body.innerText.includes('Línea base'),{timeout:20000});
 await page.screenshot({path:'/tmp/historial-corregido.png',fullPage:true});
 await page.click('[aria-label="Cerrar modal"]');
 await page.waitForFunction(()=>!Array.from(document.querySelectorAll('[role="dialog"]')).some(d=>d.textContent.includes('Historial:'))); 
 await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Ajuste masivo'))?.click());
 try{await page.waitForSelector('input[maxlength="300"]',{timeout:10000});}catch(e){console.log(JSON.stringify({body:await page.evaluate(()=>document.body.innerText.slice(0,3000)),errors,responses,consoleErrors},null,2));throw e;}
 await page.screenshot({path:'/tmp/ajuste-masivo.png',fullPage:true});
 console.log(JSON.stringify({url:page.url(),errors,requests,historyVisible:true,bulkModalVisible:true},null,2));
 if(errors.length)process.exitCode=1;
 }finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1});
