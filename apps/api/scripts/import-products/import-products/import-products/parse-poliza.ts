import * as XLSX from 'xlsx';
import * as path from 'path';

export interface PolizaPrice {
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

export function parseAllPolizaPrices(): Map<string, PolizaPrice> {
  const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const priceMap = new Map<string, PolizaPrice>();
  
  for (const year of years) {
    const filePath = path.join(__dirname, '..', '..', '..', '..', 'archivos_excel', `PRECIOS POLIZAS GOLD ${year}.xlsx`);
    
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
        
        // Find header row (row with 'CODIGO' in column C)
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
          // Keep the latest year (higher year wins)
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
  
  console.log(`POLIZA parsed: ${priceMap.size} unique codes across all years`);
  return priceMap;
}

// fs import needed
import * as fs from 'fs';

// Test if run directly
if (require.main === module) {
  const prices = parseAllPolizaPrices();
  console.log(`Total: ${prices.size}`);
  const sample = Array.from(prices.entries()).slice(0, 5);
  sample.forEach(([code, p]) => console.log(`  ${code} (${p.year}): costo=${p.costo}, pu=${p.precio_unidad}, pd=${p.precio_docena}, pm=${p.precio_mayor}`));
}