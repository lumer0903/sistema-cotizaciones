import { PrismaClient, TipoMovimiento } from '@prisma/client';

const prisma = new PrismaClient();

function generarDescripcion(p: {
  presentacion: string;
  material: string;
  numero_cabezas: number;
  composicion: string;
  colores: string[];
}): string {
  const partes = [
    p.presentacion,
    `de ${p.material}`,
    `${p.numero_cabezas} cabezas`,
    p.composicion,
    `colores: ${p.colores.join(', ')}`,
  ];
  return partes.join(', ');
}

async function main() {
  console.log('Iniciando seed de inventario...');

  const almacen = await prisma.almacen.upsert({
    where: { codigo: 'ALM-001' },
    update: {
      nombre: 'ALMACÉN PRINCIPAL',
      ubicacion: 'Sede Central',
      activo: true,
    },
    create: {
      codigo: 'ALM-001',
      nombre: 'ALMACÉN PRINCIPAL',
      ubicacion: 'Sede Central',
      activo: true,
    },
  });
  console.log('Almacen ALMACÉN PRINCIPAL listo');

  let categoriaAdorno = await prisma.categoria.findFirst({
    where: { nombre_categoria: 'ADORNO' },
  });
  if (!categoriaAdorno) {
    categoriaAdorno = await prisma.categoria.create({
      data: { nombre_categoria: 'ADORNO' },
    });
  }

  let categoriaFlor = await prisma.categoria.findFirst({
    where: { nombre_categoria: 'FLOR' },
  });
  if (!categoriaFlor) {
    categoriaFlor = await prisma.categoria.create({
      data: { nombre_categoria: 'FLOR' },
    });
  }
  console.log('Categorias ADORNO y FLOR listas');

  const placeholderUrl = (codigo: string) => `https://placehold.co/115x128?text=${encodeURIComponent(codigo)}`;

  const upsertProducto = async (producto: {
    codigo: string;
    tipo_flor: string | null;
    material: string | null;
    composicion: string | null;
    presentacion: string | null;
    numero_cabezas: number | null;
    tamano: string | null;
    colores_surtido: string[];
    id_categoria: number;
    stock_principal: number;
    stock_minimo: number;
    foto_url: string;
  }) => {
    const descripcion = generarDescripcion({
      presentacion: producto.presentacion!,
      material: producto.material!,
      numero_cabezas: producto.numero_cabezas!,
      composicion: producto.composicion!,
      colores: producto.colores_surtido,
    });

    const prod = await prisma.producto.upsert({
      where: { codigo: producto.codigo },
      update: {
        descripcion,
        tipo_flor: producto.tipo_flor,
        material: producto.material,
        composicion: producto.composicion,
        presentacion: producto.presentacion,
        numero_cabezas: producto.numero_cabezas,
        tamano: producto.tamano,
        colores_surtido: producto.colores_surtido,
        categoria: { connect: { id_categoria: producto.id_categoria } },
        stock_principal: producto.stock_principal,
        stock_total: producto.stock_principal,
        stock_minimo: producto.stock_minimo,
        foto_url: producto.foto_url,
        activo: true,
      },
      create: {
        codigo: producto.codigo,
        descripcion,
        tipo_flor: producto.tipo_flor,
        material: producto.material,
        composicion: producto.composicion,
        presentacion: producto.presentacion,
        numero_cabezas: producto.numero_cabezas,
        tamano: producto.tamano,
        colores_surtido: producto.colores_surtido,
        categoria: { connect: { id_categoria: producto.id_categoria } },
        stock_principal: producto.stock_principal,
        stock_total: producto.stock_principal,
        stock_minimo: producto.stock_minimo,
        foto_url: producto.foto_url,
        unidades_por_caja: 1,
        activo: true,
      },
    });

    await prisma.stockActual.upsert({
      where: {
        id_producto_id_almacen: {
          id_producto: prod.id_producto,
          id_almacen: almacen.id_almacen,
        },
      },
      update: {
        cantidad: producto.stock_principal,
      },
      create: {
        id_producto: prod.id_producto,
        id_almacen: almacen.id_almacen,
        cantidad: producto.stock_principal,
      },
    });

    return prod;
  };

  console.log('Insertando productos ADORNO...');

  await upsertProducto({
    codigo: 'RYG9210',
    tipo_flor: 'Rosa',
    material: 'Terciopelo',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 9,
    tamano: 'Standard',
    colores_surtido: ['Surtido', 'Rojo', 'Rosado', 'Melón', 'Blanco'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_principal: 100,
    stock_minimo: 10,
    foto_url: placeholderUrl('RYG9210'),
  });

  await upsertProducto({
    codigo: 'RYG5-A',
    tipo_flor: 'Rosa Botón',
    material: 'Tela simple',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 5,
    tamano: '20cm',
    colores_surtido: ['Azul', 'Amarillo', 'Blanco', 'Perla', 'Turquesa', 'Rosado', 'Marrón', 'Rojo', 'Lila', 'Celeste'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_principal: 150,
    stock_minimo: 15,
    foto_url: placeholderUrl('RYG5-A'),
  });

  await upsertProducto({
    codigo: 'RYG18-NU02',
    tipo_flor: 'Rosa',
    material: 'Tela Premium',
    composicion: 'Poliéster premium',
    presentacion: 'Ramo',
    numero_cabezas: 18,
    tamano: '35cm',
    colores_surtido: ['Morado', 'Rosado', 'Blanco', 'Lila/Blanco', 'Melón', 'Rosado BB', 'Lila Oscuro Gris', 'Marrón'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_principal: 80,
    stock_minimo: 8,
    foto_url: placeholderUrl('RYG18-NU02'),
  });

  await upsertProducto({
    codigo: 'RYG18-H05',
    tipo_flor: 'Rosa',
    material: 'Tela Premium',
    composicion: 'Poliéster premium',
    presentacion: 'Ramo',
    numero_cabezas: 17,
    tamano: '35cm',
    colores_surtido: ['Melón', 'Blanco', 'Lila/Melón', 'Rosado/Melón', 'Fucsia/Melón', 'Rosado BB', 'Melón Fuerte/Bajo'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_principal: 80,
    stock_minimo: 8,
    foto_url: placeholderUrl('RYG18-H05'),
  });

  await upsertProducto({
    codigo: 'RYG12JYJY',
    tipo_flor: 'Rosa Botón',
    material: 'Tela Premium',
    composicion: 'Poliéster premium',
    presentacion: 'Ramo',
    numero_cabezas: 12,
    tamano: '35cm',
    colores_surtido: ['Amarillo', 'Azul', 'Lila', 'Morado', 'Rojo', 'Rojo Oscuro', 'Rosado', 'Perla'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_principal: 100,
    stock_minimo: 10,
    foto_url: placeholderUrl('RYG12JYJY'),
  });

  await upsertProducto({
    codigo: 'RYG10-XM',
    tipo_flor: 'Rosa Estrella',
    material: 'Tela Normal',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 10,
    tamano: '35cm',
    colores_surtido: ['Rosado BB', 'Blanco'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_principal: 120,
    stock_minimo: 12,
    foto_url: placeholderUrl('RYG10-XM'),
  });

  await upsertProducto({
    codigo: 'RYG10-RS',
    tipo_flor: 'Rosa Abierta',
    material: 'Tela Normal',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 10,
    tamano: '35cm',
    colores_surtido: ['Amarillo', 'Celeste', 'Blanco', 'Perla', 'Melón', 'Hueso', 'Azul', 'Verde Botella', 'Rosado BB', 'Rosado', 'Celeste/Blanco'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_principal: 120,
    stock_minimo: 12,
    foto_url: placeholderUrl('RYG10-RS'),
  });

  await upsertProducto({
    codigo: 'RYG10XA',
    tipo_flor: 'Rosa Abierta',
    material: 'Tela Normal',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 10,
    tamano: '35cm',
    colores_surtido: ['Blanco', 'Perla', 'Turquesa'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_principal: 120,
    stock_minimo: 12,
    foto_url: placeholderUrl('RYG10XA'),
  });

  await upsertProducto({
    codigo: 'RYG93001',
    tipo_flor: 'Rosa Botón',
    material: 'Tela Normal',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 9,
    tamano: '30cm',
    colores_surtido: ['Lila', 'Melón'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_principal: 100,
    stock_minimo: 10,
    foto_url: placeholderUrl('RYG93001'),
  });

  await upsertProducto({
    codigo: 'RYG9228',
    tipo_flor: 'Rosa',
    material: 'Tela Normal',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 9,
    tamano: '30cm',
    colores_surtido: ['Rosado', 'Lila', 'Rosado Fucsia', 'Perla'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_principal: 100,
    stock_minimo: 10,
    foto_url: placeholderUrl('RYG9228'),
  });

  await upsertProducto({
    codigo: 'RYG7-X7',
    tipo_flor: 'Rosa Abierta',
    material: 'Tela Simple',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 5,
    tamano: '35cm',
    colores_surtido: ['Otoñales'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_principal: 150,
    stock_minimo: 15,
    foto_url: placeholderUrl('RYG7-X7'),
  });

  await upsertProducto({
    codigo: 'RYG7-XS',
    tipo_flor: 'Rosa',
    material: 'Tela Simple',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 5,
    tamano: '35cm',
    colores_surtido: ['Perla', 'Marrón', 'Rojo Oscuro', 'Rosado BB'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_principal: 150,
    stock_minimo: 15,
    foto_url: placeholderUrl('RYG7-XS'),
  });

  console.log('Insertando productos FLOR...');

  await upsertProducto({
    codigo: 'RMH9-01',
    tipo_flor: 'Tulipanes',
    material: 'Terciopelo',
    composicion: 'Poliéster velvet',
    presentacion: 'Ramo',
    numero_cabezas: 9,
    tamano: '35cm',
    colores_surtido: ['Morado', 'Rojo', 'Amarillo', 'Perla', 'Naranja'],
    id_categoria: categoriaFlor.id_categoria,
    stock_principal: 60,
    stock_minimo: 6,
    foto_url: placeholderUrl('RMH9-01'),
  });

  await upsertProducto({
    codigo: 'YQ12-H17',
    tipo_flor: 'Rosas',
    material: 'Tela Simple',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 12,
    tamano: '25cm',
    colores_surtido: ['Azul', 'Azul Acero', 'Fucsia', 'Perla', 'Blanco'],
    id_categoria: categoriaFlor.id_categoria,
    stock_principal: 100,
    stock_minimo: 10,
    foto_url: placeholderUrl('YQ12-H17'),
  });

  await upsertProducto({
    codigo: 'YQ10-HMN',
    tipo_flor: 'Rosa',
    material: 'Tela Simple',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 10,
    tamano: '20cm',
    colores_surtido: ['Perla', 'Azul', 'Azul Acero', 'Rosado BB', 'Rosado/Fucsia'],
    id_categoria: categoriaFlor.id_categoria,
    stock_principal: 100,
    stock_minimo: 10,
    foto_url: placeholderUrl('YQ10-HMN'),
  });

  await upsertProducto({
    codigo: 'RUY-05',
    tipo_flor: 'Rosa',
    material: 'Terciopelo',
    composicion: 'Poliéster velvet',
    presentacion: 'Unitario',
    numero_cabezas: 1,
    tamano: '35cm',
    colores_surtido: ['Rosado', 'Fucsia', 'Azul', 'Amarillo', 'Blanco', 'Morado', 'Rojo', 'Vino', 'Naranja', 'Rosado BB'],
    id_categoria: categoriaFlor.id_categoria,
    stock_principal: 200,
    stock_minimo: 20,
    foto_url: placeholderUrl('RUY-05'),
  });

  await upsertProducto({
    codigo: 'RUY-13N',
    tipo_flor: 'Rosas',
    material: 'Terciopelo',
    composicion: 'Poliéster velvet',
    presentacion: 'Ramo',
    numero_cabezas: 5,
    tamano: '35cm',
    colores_surtido: ['Rosado', 'Fucsia', 'Azul', 'Amarillo', 'Blanco', 'Morado', 'Rojo', 'Vino', 'Naranja', 'Rosado BB'],
    id_categoria: categoriaFlor.id_categoria,
    stock_principal: 100,
    stock_minimo: 10,
    foto_url: placeholderUrl('RUY-13N'),
  });

  await upsertProducto({
    codigo: 'RUY-CH',
    tipo_flor: 'Rosa',
    material: 'Terciopelo',
    composicion: 'Poliéster velvet',
    presentacion: 'Ramo',
    numero_cabezas: 7,
    tamano: '35cm',
    colores_surtido: ['Rosado', 'Fucsia', 'Azul', 'Amarillo', 'Blanco', 'Morado', 'Rojo', 'Vino', 'Naranja', 'Rosado BB'],
    id_categoria: categoriaFlor.id_categoria,
    stock_principal: 80,
    stock_minimo: 8,
    foto_url: placeholderUrl('RUY-CH'),
  });

  await upsertProducto({
    codigo: 'RUY10-RCH',
    tipo_flor: 'Rosas',
    material: 'Terciopelo',
    composicion: 'Poliéster velvet',
    presentacion: 'Ramo',
    numero_cabezas: 7,
    tamano: '35cm',
    colores_surtido: ['Rojo', 'Vino'],
    id_categoria: categoriaFlor.id_categoria,
    stock_principal: 60,
    stock_minimo: 6,
    foto_url: placeholderUrl('RUY10-RCH'),
  });

  await upsertProducto({
    codigo: 'GRA7-02',
    tipo_flor: 'Girasol',
    material: 'Tela Premium',
    composicion: 'Poliéster premium',
    presentacion: 'Ramo',
    numero_cabezas: 7,
    tamano: '35cm',
    colores_surtido: ['Amarillo'],
    id_categoria: categoriaFlor.id_categoria,
    stock_principal: 50,
    stock_minimo: 5,
    foto_url: placeholderUrl('GRA7-02'),
  });

  await upsertProducto({
    codigo: 'GRS10-12',
    tipo_flor: 'Girasol',
    material: 'Tela Premium',
    composicion: 'Poliéster premium',
    presentacion: 'Ramo',
    numero_cabezas: 10,
    tamano: '35cm',
    colores_surtido: ['Amarillo'],
    id_categoria: categoriaFlor.id_categoria,
    stock_principal: 50,
    stock_minimo: 5,
    foto_url: placeholderUrl('GRS10-12'),
  });

  await upsertProducto({
    codigo: 'GRS5-01',
    tipo_flor: 'Girasol',
    material: 'Tela Premium',
    composicion: 'Poliéster premium',
    presentacion: 'Vara',
    numero_cabezas: 5,
    tamano: 'Standard',
    colores_surtido: ['Amarillo'],
    id_categoria: categoriaFlor.id_categoria,
    stock_principal: 50,
    stock_minimo: 5,
    foto_url: placeholderUrl('GRS5-01'),
  });

  // Seed configuración empresa
  const configs = [
    { clave: 'company_ruc', valor: '20123456789', descripcion: 'RUC empresa' },
    { clave: 'company_razon_social', valor: 'Gold Continent SAC', descripcion: 'Razón social' },
    { clave: 'company_direccion', valor: 'Av. Principal 123, Lima', descripcion: 'Dirección fiscal' },
    { clave: 'company_telefono', valor: '+51 1 234 5678', descripcion: 'Teléfono' },
    { clave: 'company_email', valor: 'cotizaciones@goldcontinent.com', descripcion: 'Email' },
    { clave: 'company_logo_url', valor: '', descripcion: 'Logo URL (MinIO)' },
    { clave: 'pdf_carreta_default', valor: '15.00', descripcion: 'Costo carreta por defecto' },
    { clave: 'pdf_igv_rate', valor: '0.18', descripcion: 'Tasa IGV' },
  ];

  for (const config of configs) {
    await prisma.configuracion.upsert({
      where: { clave: config.clave },
      update: { valor: config.valor, descripcion: config.descripcion },
      create: config,
    });
  }
  console.log('Configuración empresa sembrada');

  const totalProductos = await prisma.producto.count();
  const totalStock = await prisma.stockActual.count();

  console.log('Seed inventario completado');
  console.log(`Total productos: ${totalProductos}`);
  console.log(`Total stock_actual: ${totalStock}`);
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });