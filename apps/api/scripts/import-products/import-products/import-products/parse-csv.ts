import * as fs from 'fs';
import * as path from 'path';

export interface CsvProductRow {
  codigo: string;
  descripcion: string;
  cantidad: number;
  costo: number;
  colores: string;
  tamano: string;
  tipo_flor: string;
  follaje: string;
  categoria: string;
  material: string;
  composicion: string;
  presentacion: string;
  n_cabezas: string;
}

export interface AggregatedProduct {
  codigo: string;
  descripcion: string;
  stockTotal: number;
  costo: number;
  colores: string;
  tamano: string;
  tipo_flor: string;
  follaje: string;
  categoria: string;
  material: string;
  composicion: string;
  presentacion: string;
  n_cabezas: string;
  duplicateCount: number;
}

function parseNumber(val: string): number {
  if (!val || val.trim() === '') return 0;
  const cleaned = val.replace(/,/g, '').replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseIntSafe(val: string): number {
  if (!val || val.trim() === '') return 0;
  const cleaned = val.replace(/,/g, '').replace(/[^\d-]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export function parseCsvProducts(csvPath: string): AggregatedProduct[] {
  const csv = fs.readFileSync(csvPath, 'utf8');
  const lines = csv.split('\n');
  const headers = lines[0].split(';');
  
  const productsByCode = new Map<string, AggregatedProduct>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = line.split(';');
    if (cols.length < headers.length) continue;
    
    const codigo = cols[0]?.trim();
    if (!codigo) continue;
    
    const cantidad = parseIntSafe(cols[2] || '0');
    const costo = parseNumber(cols[3] || '0');
    
    if (productsByCode.has(codigo)) {
      const existing = productsByCode.get(codigo)!;
      existing.stockTotal += cantidad;
      existing.duplicateCount += 1;
      // Keep first row's attributes
    } else {
      productsByCode.set(codigo, {
        codigo,
        descripcion: cols[1]?.trim() || '',
        stockTotal: cantidad,
        costo,
        colores: cols[4]?.trim() || '',
        tamano: cols[5]?.trim() || '',
        tipo_flor: cols[6]?.trim() || '',
        follaje: cols[7]?.trim() || '',
        categoria: cols[8]?.trim() || '',
        material: cols[9]?.trim() || '',
        composicion: cols[10]?.trim() || '',
        presentacion: cols[11]?.trim() || '',
        n_cabezas: cols[12]?.trim() || '',
        duplicateCount: 1,
      });
    }
  }
  
  console.log(`CSV parsed: ${productsByCode.size} unique codes from ${lines.length - 1} rows`);
  return Array.from(productsByCode.values());
}

// Test if run directly
if (require.main === module) {
  const csvPath = path.join(__dirname, '..', '..', '..', '..', 'archivos_excel', 'PRODUCTOS-UNIDOS.xlsx.csv');
  const products = parseCsvProducts(csvPath);
  console.log(`Sample: ${products[0].codigo} - ${products[0].descripcion} - stock: ${products[0].stockTotal} - costo: ${products[0].costo}`);
  console.log(`Total unique: ${products.length}`);
}