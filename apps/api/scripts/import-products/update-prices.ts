import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface PolizaPrice {
  year: number;
  descripcion: string;
  cantidad: number;
  costo: number;
  precio_mayor: number;
  precio_docena: number;
  precio_unidad: number;
  costo_10: number;
  precio_mayor_10: number;
  precio_docena_10: number;
  precio_unidad_10: number;
}

function parseNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  const num = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

function parseIntSafe(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  const num = parseInt(String(val).replace(/,/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function main() {
  console.log('=== UPDATING PRICES FROM POLIZA ===');
  
  // 1. Parse POLIZA prices from correct path
  const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const priceMap = new Map<string, PolizaPrice>();
  
  for (const year of years) {
    const filePath = `/app/archivos_excel/archivos_excel/PRECIOS POLIZAS GOLD ${year}.xlsx`;
    
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      continue;
    }
    
    try {
      const wb = XLSX.readFile(filePath);
      
      for (const sheetName of wb.SheetNames) {
        if (!sheetName.startsWith('POLIZA')) continue;
        
        const ws = wb.Sheets[sheetName];
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z1');
        
        let headerRow = -1;
        for (let r = 0; r <= range.e.r; r++) {
          const cell = ws[XLSX.utils.encode_cell({r, c: 2})];
          if (cell && cell.v && String(cell.v).trim() === 'CODIGO') {
            headerRow = r;
            break;
          }
        }
        
        if (headerRow < 0) continue;
        
        for (let r = headerRow + 1; r <= range.e.r; r++) {
          const codigoCell = ws[XLSX.utils.encode_cell({r, c: 2})];
          const codigo = codigoCell?.v ? String(codigoCell.v).trim() : '';
          
          if (!codigo) continue;
          
          const existing = priceMap.get(codigo);
          if (!existing || year > existing.year) {
            priceMap.set(codigo, {
              year,
              descripcion: String(ws[XLSX.utils.encode_cell({r, c: 3})]?.v || '').trim(),
              cantidad: parseIntSafe(ws[XLSX.utils.encode_cell({r, c: 4})]?.v),
              costo: parseNumber(ws[XLSX.utils.encode_cell({r, c: 5})]?.v),
              precio_mayor: parseNumber(ws[XLSX.utils.encode_cell({r, c: 6})]?.v),
              precio_docena: parseNumber(ws[XLSX.utils.encode_cell({r, c: 7})]?.v),
              precio_unidad: parseNumber(ws[XLSX.utils.encode_cell({r, c: 8})]?.v),
              costo_10: parseNumber(ws[XLSX.utils.encode_cell({r, c: 9})]?.v),
              precio_mayor_10: parseNumber(ws[XLSX.utils.encode_cell({r, c: 10})]?.v),
              precio_docena_10: parseNumber(ws[XLSX.utils.encode_cell({r, c: 11})]?.v),
              precio_unidad_10: parseNumber(ws[XLSX.utils.encode_cell({r, c: 12})]?.v),
            });
          }
        }
      }
    } catch (e) {
      console.error(`Error reading ${year}:`, e);
    }
  }
  
  console.log(`POLIZA parsed: ${priceMap.size} unique codes`);
  
  // 2. Get all products from DB
  const products = await prisma.producto.findMany({
    select: {
      id_producto: true,
      codigo: true,
    },
  });
  
  console.log(`Products in DB: ${products.length}`);
  
  // 3. Update prices for matching products
  let updated = 0;
  let notFound = 0;
  
  for (const prod of products) {
    const poliza = priceMap.get(prod.codigo);
    
    if (poliza) {
      await prisma.preciosActuales.update({
        where: { id_producto: prod.id_producto },
        data: {
          costo_normal: round2(poliza.costo),
          precio_unidad_normal: round2(poliza.precio_unidad),
          precio_docena_normal: round2(poliza.precio_docena),
          precio_mayor_normal: round2(poliza.precio_mayor),
          costo_distribuidor: round2(poliza.costo_10),
          precio_unidad_dist: round2(poliza.precio_unidad_10),
          precio_docena_dist: round2(poliza.precio_docena_10),
          precio_mayor_dist: round2(poliza.precio_mayor_10),
        },
      });
      updated++;
    } else {
      notFound++;
    }
  }
  
  console.log(`Prices updated: ${updated}`);
  console.log(`Products without POLIZA price: ${notFound}`);
  console.log(`\n✅ Price update completed!`);
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });