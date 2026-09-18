import { PrismaClient, TipoMovimiento } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de inventario...');

  const almacen = await prisma.almacen.upsert({
    where: { codigo: 'ALM-001' },
    update: {
      nombre: 'ESTANTE B',
      ubicacion: 'Zona A - Planta Principal',
      activo: true,
    },
    create: {
      codigo: 'ALM-001',
      nombre: 'ESTANTE B',
      ubicacion: 'Zona A - Planta Principal',
      activo: true,
    },
  });
  console.log('Almacen ESTANTE B listo');

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
    descripcion: string;
    tipo_flor: string | null;
    material: string | null;
    composicion: string | null;
    presentacion: string | null;
    numero_cabezas: number | null;
    tamano: string | null;
    colores_surtido: string[];
    id_categoria: number;
    stock_total: number;
    stock_minimo: number;
    foto_url: string;
  }) => {
    const prod = await prisma.producto.upsert({
      where: { codigo: producto.codigo },
      update: {
        descripcion: producto.descripcion,
        tipo_flor: producto.tipo_flor,
        material: producto.material,
        composicion: producto.composicion,
        presentacion: producto.presentacion,
        numero_cabezas: producto.numero_cabezas,
        tamano: producto.tamano,
        colores_surtido: producto.colores_surtido,
        id_categoria: producto.id_categoria,
        stock_total: producto.stock_total,
        stock_minimo: producto.stock_minimo,
        foto_url: producto.foto_url,
        activo: true,
      },
      create: {
        codigo: producto.codigo,
        descripcion: producto.descripcion,
        tipo_flor: producto.tipo_flor,
        material: producto.material,
        composicion: producto.composicion,
        presentacion: producto.presentacion,
        numero_cabezas: producto.numero_cabezas,
        tamano: producto.tamano,
        colores_surtido: producto.colores_surtido,
        id_categoria: producto.id_categoria,
        stock_total: producto.stock_total,
        stock_minimo: producto.stock_minimo,
        foto_url: producto.foto_url,
        stock_principal: producto.stock_total,
        stock_tacna: 0,
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
        cantidad: producto.stock_total,
      },
      create: {
        id_producto: prod.id_producto,
        id_almacen: almacen.id_almacen,
        cantidad: producto.stock_total,
      },
    });

    return prod;
  };

  console.log('Insertando productos ADORNO...');

  await upsertProducto({
    codigo: 'RYG9210',
    descripcion: 'Terciopelo, 9 cabezas, Ramo + Follaje, Tipo Rosa',
    tipo_flor: 'Rosa',
    material: 'Terciopelo',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 9,
    tamano: 'Standard',
    colores_surtido: ['Surtido', 'Rojo', 'Rosado', 'Melón', 'Blanco'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_total: 100,
    stock_minimo: 10,
    foto_url: placeholderUrl('RYG9210'),
  });

  await upsertProducto({
    codigo: 'RYG5-A',
    descripcion: 'Tela simple, 20cm, 5 cabezas, Ramo + Follaje, Tipo Rosa Botón',
    tipo_flor: 'Rosa Botón',
    material: 'Tela simple',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 5,
    tamano: '20cm',
    colores_surtido: ['Azul', 'Amarillo', 'Blanco', 'Perla', 'Turquesa', 'Rosado', 'Marrón', 'Rojo', 'Lila', 'Celeste'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_total: 150,
    stock_minimo: 15,
    foto_url: placeholderUrl('RYG5-A'),
  });

  await upsertProducto({
    codigo: 'RYG18-NU02',
    descripcion: 'Tela Premium, 35cm, 18 cabezas, Ramo + Follaje, Tipo Rosa',
    tipo_flor: 'Rosa',
    material: 'Tela Premium',
    composicion: 'Poliéster premium',
    presentacion: 'Ramo',
    numero_cabezas: 18,
    tamano: '35cm',
    colores_surtido: ['Morado', 'Rosado', 'Blanco', 'Lila/Blanco', 'Melón', 'Rosado BB', 'Lila Oscuro Gris', 'Marrón'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_total: 80,
    stock_minimo: 8,
    foto_url: placeholderUrl('RYG18-NU02'),
  });

  await upsertProducto({
    codigo: 'RYG18-H05',
    descripcion: 'Tela Premium, 35cm, 17 cabezas, Ramo + Follaje, Tipo Rosa',
    tipo_flor: 'Rosa',
    material: 'Tela Premium',
    composicion: 'Poliéster premium',
    presentacion: 'Ramo',
    numero_cabezas: 17,
    tamano: '35cm',
    colores_surtido: ['Melón', 'Blanco', 'Lila/Melón', 'Rosado/Melón', 'Fucsia/Melón', 'Rosado BB', 'Melón Fuerte/Bajo'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_total: 80,
    stock_minimo: 8,
    foto_url: placeholderUrl('RYG18-H05'),
  });

  await upsertProducto({
    codigo: 'RYG12JYJY',
    descripcion: 'Tela Premium, 35cm, 12 cabezas, Ramo + Follaje, Tipo Rosa Botón',
    tipo_flor: 'Rosa Botón',
    material: 'Tela Premium',
    composicion: 'Poliéster premium',
    presentacion: 'Ramo',
    numero_cabezas: 12,
    tamano: '35cm',
    colores_surtido: ['Amarillo', 'Azul', 'Lila', 'Morado', 'Rojo', 'Rojo Oscuro', 'Rosado', 'Perla'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_total: 100,
    stock_minimo: 10,
    foto_url: placeholderUrl('RYG12JYJY'),
  });

  await upsertProducto({
    codigo: 'RYG10-XM',
    descripcion: 'Tela Normal, 35cm, 10 cabezas, Ramo + Follaje, Tipo Rosa Estrella',
    tipo_flor: 'Rosa Estrella',
    material: 'Tela Normal',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 10,
    tamano: '35cm',
    colores_surtido: ['Rosado BB', 'Blanco'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_total: 120,
    stock_minimo: 12,
    foto_url: placeholderUrl('RYG10-XM'),
  });

  await upsertProducto({
    codigo: 'RYG10-RS',
    descripcion: 'Tela Normal, 35cm, 10 cabezas, Ramo + Follaje, Tipo Rosa Abierta',
    tipo_flor: 'Rosa Abierta',
    material: 'Tela Normal',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 10,
    tamano: '35cm',
    colores_surtido: ['Amarillo', 'Celeste', 'Blanco', 'Perla', 'Melón', 'Hueso', 'Azul', 'Verde Botella', 'Rosado BB', 'Rosado', 'Celeste/Blanco'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_total: 120,
    stock_minimo: 12,
    foto_url: placeholderUrl('RYG10-RS'),
  });

  await upsertProducto({
    codigo: 'RYG10XA',
    descripcion: 'Tela Normal, 35cm, 10 cabezas, Ramo + Follaje, Tipo Rosa Abierta',
    tipo_flor: 'Rosa Abierta',
    material: 'Tela Normal',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 10,
    tamano: '35cm',
    colores_surtido: ['Blanco', 'Perla', 'Turquesa'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_total: 120,
    stock_minimo: 12,
    foto_url: placeholderUrl('RYG10XA'),
  });

  await upsertProducto({
    codigo: 'RYG93001',
    descripcion: 'Tela Normal, 30cm, 9 cabezas, Ramo + Follaje Oscuro, Tipo Rosa Botón (Otoñal)',
    tipo_flor: 'Rosa Botón',
    material: 'Tela Normal',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 9,
    tamano: '30cm',
    colores_surtido: ['Lila', 'Melón'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_total: 100,
    stock_minimo: 10,
    foto_url: placeholderUrl('RYG93001'),
  });

  await upsertProducto({
    codigo: 'RYG9228',
    descripcion: 'Tela Normal, 30cm, 9 cabezas, Ramo + Follaje Primaveral, Tipo Rosa',
    tipo_flor: 'Rosa',
    material: 'Tela Normal',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 9,
    tamano: '30cm',
    colores_surtido: ['Rosado', 'Lila', 'Rosado Fucsia', 'Perla'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_total: 100,
    stock_minimo: 10,
    foto_url: placeholderUrl('RYG9228'),
  });

  await upsertProducto({
    codigo: 'RYG7-X7',
    descripcion: 'Tela Simple, 35cm, 5 cabezas, Ramo + Follaje, Tipo Rosa Abierta',
    tipo_flor: 'Rosa Abierta',
    material: 'Tela Simple',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 5,
    tamano: '35cm',
    colores_surtido: ['Otoñales'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_total: 150,
    stock_minimo: 15,
    foto_url: placeholderUrl('RYG7-X7'),
  });

  await upsertProducto({
    codigo: 'RYG7-XS',
    descripcion: 'Tela Simple, 35cm, 5 cabezas, Ramo + Follaje, Tipo Rosa',
    tipo_flor: 'Rosa',
    material: 'Tela Simple',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 5,
    tamano: '35cm',
    colores_surtido: ['Perla', 'Marrón', 'Rojo Oscuro', 'Rosado BB'],
    id_categoria: categoriaAdorno.id_categoria,
    stock_total: 150,
    stock_minimo: 15,
    foto_url: placeholderUrl('RYG7-XS'),
  });

  console.log('Insertando productos FLOR...');

  await upsertProducto({
    codigo: 'RMH9-01',
    descripcion: 'Terciopelo, 35cm, 9 cabezas, Ramo, Tipo Tulipanes',
    tipo_flor: 'Tulipanes',
    material: 'Terciopelo',
    composicion: 'Poliéster velvet',
    presentacion: 'Ramo',
    numero_cabezas: 9,
    tamano: '35cm',
    colores_surtido: ['Morado', 'Rojo', 'Amarillo', 'Perla', 'Naranja'],
    id_categoria: categoriaFlor.id_categoria,
    stock_total: 60,
    stock_minimo: 6,
    foto_url: placeholderUrl('RMH9-01'),
  });

  await upsertProducto({
    codigo: 'YQ12-H17',
    descripcion: 'Tela Simple, 25cm, 12 cabezas, Ramo, Tipo Rosas',
    tipo_flor: 'Rosas',
    material: 'Tela Simple',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 12,
    tamano: '25cm',
    colores_surtido: ['Azul', 'Azul Acero', 'Fucsia', 'Perla', 'Blanco'],
    id_categoria: categoriaFlor.id_categoria,
    stock_total: 100,
    stock_minimo: 10,
    foto_url: placeholderUrl('YQ12-H17'),
  });

  await upsertProducto({
    codigo: 'YQ10-HMN',
    descripcion: 'Tela Simple, 20cm, 10 cabezas, Ramo + Poco Follaje, Tipo Rosa',
    tipo_flor: 'Rosa',
    material: 'Tela Simple',
    composicion: 'Poliéster',
    presentacion: 'Ramo',
    numero_cabezas: 10,
    tamano: '20cm',
    colores_surtido: ['Perla', 'Azul', 'Azul Acero', 'Rosado BB', 'Rosado/Fucsia'],
    id_categoria: categoriaFlor.id_categoria,
    stock_total: 100,
    stock_minimo: 10,
    foto_url: placeholderUrl('YQ10-HMN'),
  });

  await upsertProducto({
    codigo: 'RUY-05',
    descripcion: 'Terciopelo, 35cm, 1 cabeza, Unitario, Tipo Rosa (Estrella/Botón/Guadalupe)',
    tipo_flor: 'Rosa',
    material: 'Terciopelo',
    composicion: 'Poliéster velvet',
    presentacion: 'Unitario',
    numero_cabezas: 1,
    tamano: '35cm',
    colores_surtido: ['Rosado', 'Fucsia', 'Azul', 'Amarillo', 'Blanco', 'Morado', 'Rojo', 'Vino', 'Naranja', 'Rosado BB'],
    id_categoria: categoriaFlor.id_categoria,
    stock_total: 200,
    stock_minimo: 20,
    foto_url: placeholderUrl('RUY-05'),
  });

  await upsertProducto({
    codigo: 'RUY-13N',
    descripcion: 'Terciopelo, 35cm, 5 cabezas, Ramo, Tipo Rosas',
    tipo_flor: 'Rosas',
    material: 'Terciopelo',
    composicion: 'Poliéster velvet',
    presentacion: 'Ramo',
    numero_cabezas: 5,
    tamano: '35cm',
    colores_surtido: ['Rosado', 'Fucsia', 'Azul', 'Amarillo', 'Blanco', 'Morado', 'Rojo', 'Vino', 'Naranja', 'Rosado BB'],
    id_categoria: categoriaFlor.id_categoria,
    stock_total: 100,
    stock_minimo: 10,
    foto_url: placeholderUrl('RUY-13N'),
  });

  await upsertProducto({
    codigo: 'RUY-CH',
    descripcion: 'Terciopelo, 35cm, 7 cabezas, Ramo, Tipo Rosa',
    tipo_flor: 'Rosa',
    material: 'Terciopelo',
    composicion: 'Poliéster velvet',
    presentacion: 'Ramo',
    numero_cabezas: 7,
    tamano: '35cm',
    colores_surtido: ['Rosado', 'Fucsia', 'Azul', 'Amarillo', 'Blanco', 'Morado', 'Rojo', 'Vino', 'Naranja', 'Rosado BB'],
    id_categoria: categoriaFlor.id_categoria,
    stock_total: 80,
    stock_minimo: 8,
    foto_url: placeholderUrl('RUY-CH'),
  });

  await upsertProducto({
    codigo: 'RUY10-RCH',
    descripcion: 'Terciopelo, 35cm, 7 cabezas, Ramo + Follaje, Tipo Rosas',
    tipo_flor: 'Rosas',
    material: 'Terciopelo',
    composicion: 'Poliéster velvet',
    presentacion: 'Ramo',
    numero_cabezas: 7,
    tamano: '35cm',
    colores_surtido: ['Rojo', 'Vino'],
    id_categoria: categoriaFlor.id_categoria,
    stock_total: 60,
    stock_minimo: 6,
    foto_url: placeholderUrl('RUY10-RCH'),
  });

  await upsertProducto({
    codigo: 'GRA7-02',
    descripcion: 'Tela Premium, 35cm, 7 cabezas, Ramo, Tipo Girasol',
    tipo_flor: 'Girasol',
    material: 'Tela Premium',
    composicion: 'Poliéster premium',
    presentacion: 'Ramo',
    numero_cabezas: 7,
    tamano: '35cm',
    colores_surtido: ['Amarillo'],
    id_categoria: categoriaFlor.id_categoria,
    stock_total: 50,
    stock_minimo: 5,
    foto_url: placeholderUrl('GRA7-02'),
  });

  await upsertProducto({
    codigo: 'GRS10-12',
    descripcion: 'Tela Premium, 35cm, 10 cabezas, Ramo, Tipo Girasol',
    tipo_flor: 'Girasol',
    material: 'Tela Premium',
    composicion: 'Poliéster premium',
    presentacion: 'Ramo',
    numero_cabezas: 10,
    tamano: '35cm',
    colores_surtido: ['Amarillo'],
    id_categoria: categoriaFlor.id_categoria,
    stock_total: 50,
    stock_minimo: 5,
    foto_url: placeholderUrl('GRS10-12'),
  });

  await upsertProducto({
    codigo: 'GRS5-01',
    descripcion: 'Tela Premium, 5 cabezas, Vara, Tipo Girasol',
    tipo_flor: 'Girasol',
    material: 'Tela Premium',
    composicion: 'Poliéster premium',
    presentacion: 'Vara',
    numero_cabezas: 5,
    tamano: 'Standard',
    colores_surtido: ['Amarillo'],
    id_categoria: categoriaFlor.id_categoria,
    stock_total: 50,
    stock_minimo: 5,
    foto_url: placeholderUrl('GRS5-01'),
  });

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