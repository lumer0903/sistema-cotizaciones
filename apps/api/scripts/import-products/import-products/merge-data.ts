import { AggregatedProduct } from './parse-csv';
import { PolizaPrice } from './parse-poliza';
import { getCategoryIdByPresentacion } from './categorize';

export interface ImportProduct {
  codigo: string;
  descripcion: string;
  stockTotal: number;
  costo: number;
  colores: string;
  tamano: string;
  tipo_flor: string;
  follaje: string;
  material: string;
  composicion: string;
  presentacion: string;
  n_cabezas: string;
  id_categoria: number;
  
  // Prices (8 fields)
  costo_normal: number;
  precio_tienda_unidad: number;
  precio_tienda_docena: number;
  precio_tienda_caja: number;
  costo_distribuidor: number;
  precio_distribuidor_unidad: number;
  precio_distribuidor_docena: number;
  precio_distribuidor_caja: number;
  
  // Source info
  priceSource: 'poliza' | 'derived';
  polizaYear?: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseColores(colores: string): string[] {
  if (!colores || colores.trim() === '') return [];
  
  const cleaned = colores
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, ',')
    .replace(/;/g, ',')
    .replace(/,,+/g, ',');
  
  const parts = cleaned.split(',').map(p => p.trim()).filter(p => p.length > 0);
  
  // Remove duplicates while preserving order
  const seen = new Set<string>();
  return parts.filter(p => {
    const lower = p.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

function parseNCabezas(n_cabezas: string): number | null {
  if (!n_cabezas || n_cabezas.trim() === '' || n_cabezas.trim() === '-') return null;
  const num = parseInt(n_cabezas.replace(/[^\d]/g, ''), 10);
  return isNaN(num) ? null : num;
}

export function mergeData(
  csvProducts: AggregatedProduct[],
  polizaPrices: Map<string, PolizaPrice>
): ImportProduct[] {
  const results: ImportProduct[] = [];
  
  for (const csv of csvProducts) {
    const poliza = polizaPrices.get(csv.codigo);
    const id_categoria = getCategoryIdByPresentacion(csv.presentacion);
    const coloresArray = parseColores(csv.colores);
    const n_cabezas = parseNCabezas(csv.n_cabezas);
    
    let priceSource: 'poliza' | 'derived' = 'derived';
    let polizaYear: number | undefined;
    let prices: Omit<ImportProduct, 'codigo' | 'descripcion' | 'stockTotal' | 'costo' | 'colores' | 'tamano' | 'tipo_flor' | 'follaje' | 'material' | 'composicion' | 'presentacion' | 'n_cabezas' | 'id_categoria' | 'priceSource' | 'polizaYear'>;
    
    if (poliza) {
      // Use POLIZA prices (normal tier)
      prices = {
        costo_normal: round2(poliza.costo),
        precio_tienda_unidad: round2(poliza.precio_unidad),
        precio_tienda_docena: round2(poliza.precio_docena),
        precio_tienda_caja: round2(poliza.precio_mayor),
        costo_distribuidor: round2(poliza.costo_10),
        precio_distribuidor_unidad: round2(poliza.precio_unidad_10),
        precio_distribuidor_docena: round2(poliza.precio_docena_10),
        precio_distribuidor_caja: round2(poliza.precio_mayor_10),
      };
      priceSource = 'poliza';
      polizaYear = poliza.year;
    } else {
      // Derive from CSV costo using standard margins
      const costo = round2(csv.costo);
      prices = {
        costo_normal: costo,
        precio_tienda_unidad: round2(costo * 1.5),
        precio_tienda_docena: round2(costo * 1.4),
        precio_tienda_caja: round2(costo * 1.3),
        costo_distribuidor: round2(costo * 1.1),
        precio_distribuidor_unidad: round2(costo * 1.2),
        precio_distribuidor_docena: round2(costo * 1.15),
        precio_distribuidor_caja: round2(costo * 1.1),
      };
      priceSource = 'derived';
    }
    
    // Generate structured description if empty
    let descripcion = csv.descripcion;
    if (!descripcion || descripcion.trim() === '') {
      const parts = [
        csv.codigo,
        csv.tipo_flor,
        csv.material,
        csv.composicion,
        n_cabezas ? `${n_cabezas} CABEZAS` : '',
        csv.tamano,
      ].filter(Boolean);
      descripcion = parts.join(' ');
    }
    
    results.push({
      codigo: csv.codigo,
      descripcion,
      stockTotal: csv.stockTotal,
      costo: round2(csv.costo),
      colores: coloresArray.join(', '),
      tamano: csv.tamano,
      tipo_flor: csv.tipo_flor || 'Sin tipo',
      follaje: csv.follaje || 'Sin follaje',
      material: csv.material || 'Sin material',
      composicion: csv.composicion || 'Sin composicion',
      presentacion: csv.presentacion || 'Sin presentacion',
      n_cabezas: n_cabezas?.toString() || '-',
      id_categoria,
      ...prices,
      priceSource,
      polizaYear,
    });
  }
  
  console.log(`Merge complete: ${results.length} products`);
  const bySource = new Map<string, number>();
  results.forEach(p => bySource.set(p.priceSource, (bySource.get(p.priceSource) || 0) + 1));
  console.log('  By source:', Array.from(bySource.entries()));
  
  return results;
}

// Test if run directly
if (require.main === module) {
  // Quick test
  console.log('Test merge module loaded');
}