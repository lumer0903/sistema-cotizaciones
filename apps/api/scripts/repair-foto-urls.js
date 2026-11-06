/**
 * Repara productos.foto_url cuyo objeto no existe en MinIO.
 *
 * Síntoma: en el panel de recomendaciones (y cualquier otra vista) las fotos
 * no se muestran y se sustituye por el ícono de categoría, porque la URL
 * guardada devuelve 404.
 *
 * Causa: parte del catálogo se cargó con una extensión distinta a la del
 * objeto real (p.ej. foto_url ".../RUY-03.png" pero en el bucket existe
 * "RUY-03.jpg"), o con otro nombre de archivo.
 *
 * Estrategia: listar el bucket `product-images` y, para cada URL rota,
 * buscar el objeto real por nombre base (mismo stem, cualquier extensión,
 * mayúsculas/minúsculas indiferentes y prefijo de timestamp opcional).
 * Si se encuentra, se reescribe foto_url a la clave que realmente existe.
 *
 * Uso:  node scripts/repair-foto-urls.js            (aplica cambios)
 *       DRY_RUN=1 node scripts/repair-foto-urls.js  (solo simula)
 */
const { PrismaClient } = require('@prisma/client');
const Minio = require('minio');

const prisma = new PrismaClient();
const minio = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET = 'product-images';
const DRY_RUN = process.env.DRY_RUN === '1';

function listAllKeys() {
  return new Promise((resolve, reject) => {
    const keys = [];
    const stream = minio.listObjectsV2(BUCKET, '', true);
    stream.on('data', (o) => keys.push(o.name));
    stream.on('end', () => resolve(keys));
    stream.on('error', reject);
  });
}

function stemOf(key) {
  const base = key.split('/').pop().toLowerCase();
  return base.replace(/\.[^.]+$/, '').replace(/^\d+-/, '');
}

async function main() {
  const keys = await listAllKeys();
  console.log(`Objetos en bucket '${BUCKET}': ${keys.length} | DRY_RUN=${DRY_RUN ? 'sí' : 'no'}`);

  // índice: stem -> claves reales
  const byStem = new Map();
  for (const k of keys) {
    const s = stemOf(k);
    if (!byStem.has(s)) byStem.set(s, []);
    byStem.get(s).push(k);
  }

  const rows = await prisma.producto.findMany({
    where: { foto_url: { contains: `/${BUCKET}/` } },
    select: { id_producto: true, codigo: true, foto_url: true },
  });

  let ok = 0;
  const repaired = [];
  const stillMissing = [];

  for (const row of rows) {
    const url = row.foto_url || '';
    const idx = url.indexOf(`/${BUCKET}/`);
    const prefix = url.slice(0, idx + `/${BUCKET}/`.length);
    const currentKey = url.slice(prefix.length);
    if (currentKey && keys.includes(currentKey)) {
      ok++;
      continue;
    }

    const candidates = byStem.get(stemOf(currentKey)) || byStem.get(row.codigo.toLowerCase()) || [];
    if (candidates.length) {
      // preferir extensión idéntica a la guardada, si no la primera
      const ext = (currentKey.match(/\.[^.]+$/) || [''])[0].toLowerCase();
      const chosen =
        candidates.find((c) => c.toLowerCase().endsWith(ext)) || candidates[0];
      repaired.push({ id: row.id_producto, codigo: row.codigo, from: currentKey, to: chosen, url: `${prefix}${chosen}` });
    } else {
      stillMissing.push({ codigo: row.codigo, key: currentKey });
    }
  }

  console.log(`URL válidas: ${ok}`);
  console.log(`Reparables:  ${repaired.length}`);
  console.log(`Sin objeto:  ${stillMissing.length}`);

  if (DRY_RUN) {
    repaired.slice(0, 15).forEach((r) => console.log(`  ~ ${r.codigo}: ${r.from} -> ${r.to}`));
    return;
  }

  let updated = 0;
  for (const r of repaired) {
    await prisma.producto.update({ where: { id_producto: r.id }, data: { foto_url: r.url } });
    updated++;
    if (updated % 100 === 0) console.log(`  actualizadas: ${updated}...`);
  }
  console.log(`foto_url actualizadas: ${updated}`);
  stillMissing.slice(0, 15).forEach((s) => console.log(`  sin imagen: ${s.codigo} (${s.key})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
