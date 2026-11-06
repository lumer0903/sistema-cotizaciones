import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parseCsvProducts } from './parse-csv';
import { parseAllPolizaPrices } from './parse-poliza';
import { mergeData, ImportProduct } from './merge-data';

const MINIO_ENDPOINT = 'localhost';
const MINIO_PORT = 9000;
const MINIO_ACCESS_KEY = 'minioadmin';
const MINIO_SECRET_KEY = 'minioadmin';
const MINIO_BUCKET = 'product-images';

const CHUNK_SIZE = 50;
const ALMACEN_ID = 1; // ALM-001 Lima Centro

const minioClient = new (require('minio')).Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: false,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});
const STOCK_MINIMO = 20;

interface ImportStats {
  total: number;
  created: number;
  errors: number;
  alerts: number;
  bySource: Map<string, number>;
}

async function importChunk(products: ImportProduct[], chunkIndex: number, stats: ImportStats): Promise<void> {
  console.log(`\n--- Chunk ${chunkIndex + 1} (${products.length} products) ---`);
  
  for (const prod of products) {
    try {
      await prisma.$transaction(async (tx) => {
        // Create Producto
        const producto = await tx.producto.create({
          data: {
            codigo: prod.codigo,
            descripcion: prod.descripcion,
            tipo_flor: prod.tipo_flor,
            material: prod.material,
            composicion: prod.composicion,
            presentacion: prod.presentacion,
            follaje: prod.follaje,
            numero_cabezas: prod.n_cabezas === '-' ? null : parseInt(prod.n_cabezas, 10) || null,
            tamano: prod.tamano,
            colores_surtido: prod.colores ? prod.colores.split(',').map(c => c.trim()).filter(Boolean) : [],
            foto_url: await uploadProductImage(prod.codigo),
            activo: true,
            stock_principal: prod.stockTotal,
            stock_total: prod.stockTotal,
            stock_minimo: STOCK_MINIMO,
            unidades_por_caja: 1,
            id_categoria: prod.id_categoria,
          },
          select: { id_producto: true },
        });
        
        // Create PreciosActuales
        await tx.preciosActuales.create({
          data: {
            id_producto: producto.id_producto,
            costo_normal: prod.costo_normal,
            precio_unidad_normal: prod.precio_tienda_unidad,
            precio_docena_normal: prod.precio_tienda_docena,
            precio_mayor_normal: prod.precio_tienda_caja,
            costo_distribuidor: prod.costo_distribuidor,
            precio_unidad_dist: prod.precio_distribuidor_unidad,
            precio_docena_dist: prod.precio_distribuidor_docena,
            precio_mayor_dist: prod.precio_distribuidor_caja,
          },
        });
        
        // Create StockActual
        await tx.stockActual.create({
          data: {
            id_producto: producto.id_producto,
            id_almacen: ALMACEN_ID,
            cantidad: prod.stockTotal,
          },
        });
        
        // Create InventarioMovimiento (entrada inicial)
        await tx.inventarioMovimiento.create({
          data: {
            id_producto: producto.id_producto,
            id_almacen: ALMACEN_ID,
            tipo: 'entrada',
            origen: 'ajuste_fisico',
            cantidad: prod.stockTotal,
            stock_anterior: 0,
            stock_posterior: prod.stockTotal,
            costo_unitario: prod.costo_normal,
            observaciones: 'Stock inicial importación masiva',
          },
        });
        
        // Create Alerta if stock < minimo
        if (prod.stockTotal < STOCK_MINIMO) {
          await tx.alertas_stock.create({
            data: {
              id_producto: producto.id_producto,
              id_almacen: ALMACEN_ID,
              stock_actual: prod.stockTotal,
              stock_minimo: STOCK_MINIMO,
              estado: 'activa',
            },
          });
          stats.alerts++;
        }
        
        stats.bySource.set(prod.priceSource, (stats.bySource.get(prod.priceSource) || 0) + 1);
        stats.created++;
      });
      
      if (stats.created % 25 === 0) {
        console.log(`  Progress: ${stats.created}/${stats.total} created, ${stats.errors} errors, ${stats.alerts} alerts`);
      }
      
    } catch (error) {
      stats.errors++;
      console.error(`  ERROR ${prod.codigo}:`, error instanceof Error ? error.message : error);
    }
  }
}

async function uploadProductImage(codigo: string): Promise<string | null> {
  const possiblePaths = [
    path.join(__dirname, '..', '..', '..', '..', 'uploads', 'productos', `${codigo}.jpg`),
    path.join(__dirname, '..', '..', '..', '..', 'uploads', 'productos', `${codigo}.png`),
    path.join(__dirname, '..', '..', '..', '..', 'uploads', 'productos', `${codigo}.jpeg`),
    path.join(__dirname, '..', '..', '..', '..', 'uploads', 'productos', `${codigo}.webp`),
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      const filename = `${Date.now()}-${path.basename(filePath)}`;
      const key = `productos/${filename}`;

      try {
        await minioClient.putObject(MINIO_BUCKET, key, fileBuffer, fileBuffer.length, {
          'Content-Type': getMimeType(path.basename(filePath)),
        });
        const url = `http://${MINIO_ENDPOINT}:${MINIO_PORT}/${MINIO_BUCKET}/${key}`;
        return url;
      } catch (error) {
        console.error(`  Error uploading image for ${codigo}:`, error instanceof Error ? error.message : error);
      }
    }
  }

  return null;
}

function getMimeType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

async function main() {
  console.log('=== BULK PRODUCT IMPORT ===');
  console.log(`Chunk size: ${CHUNK_SIZE}`);
  console.log(`Almacén: ALM-001 (Lima Centro)`);
  console.log(`Stock mínimo: ${STOCK_MINIMO}`);
  
  // 1. Parse CSV
  const csvPath = '/app/archivos_excel/PRODUCTOS-UNIDOS.xlsx.csv';
  console.log('\n1. Parsing CSV...');
  const csvProducts = parseCsvProducts(csvPath);
  
  // 2. Parse POLIZA prices
  console.log('\n2. Parsing POLIZA prices...');
  const polizaPrices = parseAllPolizaPrices();
  
  // 3. Merge data
  console.log('\n3. Merging data...');
  const importProducts = mergeData(csvProducts, polizaPrices);
  
  // 4. Import in chunks
  console.log('\n4. Importing to database...');
  const stats: ImportStats = {
    total: importProducts.length,
    created: 0,
    errors: 0,
    alerts: 0,
    bySource: new Map(),
  };
  
  for (let i = 0; i < importProducts.length; i += CHUNK_SIZE) {
    const chunk = importProducts.slice(i, i + CHUNK_SIZE);
    await importChunk(chunk, Math.floor(i / CHUNK_SIZE), stats);
  }
  
  // 5. Final verification
  console.log('\n=== VERIFICATION ===');
  const [
    countProductos,
    countPrecios,
    countStock,
    countMovimientos,
    countAlertas,
    countCategorias,
  ] = await Promise.all([
    prisma.producto.count(),
    prisma.preciosActuales.count(),
    prisma.stockActual.count({ where: { id_almacen: ALMACEN_ID } }),
    prisma.inventarioMovimiento.count(),
    prisma.alertas_stock.count(),
    prisma.categoria.count(),
  ]);
  
  console.log(`Productos: ${countProductos}`);
  console.log(`PreciosActuales: ${countPrecios}`);
  console.log(`StockActual (ALM-001): ${countStock}`);
  console.log(`InventarioMovimientos: ${countMovimientos}`);
  console.log(`AlertasStock: ${countAlertas}`);
  console.log(`Categorias: ${countCategorias}`);
  console.log(`Created: ${stats.created}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Alerts created: ${stats.alerts}`);
  console.log('By source:', Array.from(stats.bySource.entries()));
  
  if (stats.errors > 0) {
    console.log('\n⚠️  Some products failed to import');
    process.exit(1);
  } else {
    console.log('\n✅ Import completed successfully!');
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });