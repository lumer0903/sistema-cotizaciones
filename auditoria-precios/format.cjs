const fs=require('node:fs'),path=require('node:path');
const ts=require('../apps/web/node_modules/typescript');
const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
const root=path.resolve(__dirname,'..');
const files=[
 'apps/api/src/common/utils/precios.util.ts','apps/api/src/modules/precios/pricing.dto.ts',
 'apps/api/src/modules/precios/pricing.service.ts','apps/api/src/modules/precios/pricing.controller.ts',
 'apps/api/src/modules/historial-precios/historial-precios.service.ts','apps/api/src/modules/historial-precios/historial-precios.controller.ts'
];
for(const p of files)fs.writeFileSync(path.join(root,p),printer.printFile(ts.createSourceFile(p,fs.readFileSync(path.join(root,p),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)));
console.log('Formato backend: '+files.length);
