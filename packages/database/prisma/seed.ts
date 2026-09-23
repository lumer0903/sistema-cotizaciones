import { PrismaClient, Rol } from '@prisma/client';

const prisma = new PrismaClient();

// Helper para generar 6 precios coherentes basados en una unidad base
function generar6Precios(esFlor: boolean) {
  const baseUnidad = esFlor
    ? Math.random() * 20 + 15  // S/ 15.00 a S/ 35.00
    : Math.random() * 7 + 8;   // S/ 8.00 a S/ 15.00

  const costoNormal = baseUnidad * (0.55 + Math.random() * 0.1);

  const precioUnidadNormal = baseUnidad;
  const precioDocenaNormal = baseUnidad * 10 * (0.85 + Math.random() * 0.05);
  const precioMayorNormal = baseUnidad * 100 * (0.65 + Math.random() * 0.05);

  const factorDist = 0.82 + Math.random() * 0.06;

  const costoDistribuidor = costoNormal * factorDist;
  const precioUnidadDist = precioUnidadNormal * factorDist;
  const precioDocenaDist = precioDocenaNormal * factorDist;
  const precioMayorDist = precioMayorNormal * factorDist;

  return {
    costo_normal: Number(costoNormal.toFixed(2)),
    precio_unidad_normal: Number(precioUnidadNormal.toFixed(2)),
    precio_docena_normal: Number(precioDocenaNormal.toFixed(2)),
    precio_mayor_normal: Number(precioMayorNormal.toFixed(2)),
    costo_distribuidor: Number(costoDistribuidor.toFixed(2)),
    precio_unidad_dist: Number(precioUnidadDist.toFixed(2)),
    precio_docena_dist: Number(precioDocenaDist.toFixed(2)),
    precio_mayor_dist: Number(precioMayorDist.toFixed(2)),
  };
}

async function main() {
  console.log(' Iniciando seed enriquecido...');

  // 1. Almacenes con Ubicaciones por Estante
  const almacenesData = [
    { codigo: 'ALM-001', nombre: 'Lima Centro', ubicacion: 'Estante A - Pasillo 1', activo: true },
    { codigo: 'ALM-002', nombre: 'Lima Norte', ubicacion: 'Estante B - Pasillo 2', activo: true },
    { codigo: 'ALM-003', nombre: 'Lima Sur', ubicacion: 'Estante C - Pasillo 3', activo: true },
    { codigo: 'ALM-004', nombre: 'Tacna', ubicacion: 'Estante A - Depósito Central', activo: true },
  ];

  const almacenesCreados = [];
  for (const alm of almacenesData) {
    const a = await prisma.almacen.upsert({
      where: { codigo: alm.codigo },
      update: alm,
      create: alm,
    });
    almacenesCreados.push(a);
  }
  console.log(` ${almacenesCreados.length} Almacenes y Ubicaciones creados`);

  // 2. Categorías (Se eliminó 'descripcion' para coincidir con el schema)
  const categoriasNombres = [
    'Ramos y Bouquets',
    'Varas Sueltas',
    'Adornos y Follaje',
    'Arreglos Especiales',
  ];

  const categoriasCreadas = [];
  for (const nombre_categoria of categoriasNombres) {
    let c = await prisma.categoria.findFirst({
      where: { nombre_categoria },
    });
    if (!c) {
      c = await prisma.categoria.create({
        data: { nombre_categoria },
      });
    }
    categoriasCreadas.push(c);
  }
  console.log(' Categorías verificadas/creadas');

  // 3. Productos con Atributos Completos
  const productosData = [
    {
      codigo: 'RYG18-NU02',
      tipo_flor: 'Rosa',
      material: 'Tela Premium',
      composicion: 'Poliéster Velvet',
      presentacion: 'Ramo',
      numero_cabezas: 18,
      tamano: '10x20',
      unidades_por_caja: 12,
      stock_principal: 150,
      stock_minimo: 15,
      descripcion: 'RAMO DE ROSA TELA PREMIUM DE 18 CABEZAS 10X20 (CAJA X 12 UNID)',
      colores_surtido: ['ROJO', 'BLANCO', 'ROSADO', 'AMARILLO'],
      foto_url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=500&auto=format&fit=crop&q=60',
      id_categoria: categoriasCreadas[0].id_categoria,
      esFlor: true,
    },
    {
      codigo: 'PEUWBA2',
      tipo_flor: 'Peonía',
      material: 'Seda Sintética',
      composicion: 'Poliéster Silky',
      presentacion: 'Ramo',
      numero_cabezas: 9,
      tamano: '15x25',
      unidades_por_caja: 24,
      stock_principal: 80,
      stock_minimo: 10,
      descripcion: 'RAMO DE PEONÍA SEDA SINTÉTICA DE 9 CABEZAS 15X25 (CAJA X 24 UNID)',
      colores_surtido: ['ROSA PASTEL', 'CORAL', 'MARFIL'],
      foto_url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=500&auto=format&fit=crop&q=60',
      id_categoria: categoriasCreadas[0].id_categoria,
      esFlor: true,
    },
    {
      codigo: 'CODIGO1111',
      tipo_flor: 'Girasol',
      material: 'Tela Simple',
      composicion: 'Poliéster Estándar',
      presentacion: 'Vara',
      numero_cabezas: 5,
      tamano: '12x30',
      unidades_por_caja: 36,
      stock_principal: 200,
      stock_minimo: 20,
      descripcion: 'VARA DE GIRASOL TELA SIMPLE DE 5 CABEZAS 12X30 (CAJA X 36 UNID)',
      colores_surtido: ['AMARILLO INTENSO'],
      foto_url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=500&auto=format&fit=crop&q=60',
      id_categoria: categoriasCreadas[1].id_categoria,
      esFlor: true,
    },
    {
      codigo: 'ADORN-001',
      tipo_flor: 'Eucalipto',
      material: 'Plástico Flexible',
      composicion: 'PVC Mate',
      presentacion: 'Unitario',
      numero_cabezas: 1,
      tamano: '20x40',
      unidades_por_caja: 50,
      stock_principal: 300,
      stock_minimo: 30,
      descripcion: 'FOLLAJE EUCALIPTO PLÁSTICO FLEXIBLE MATE 20X40 (CAJA X 50 UNID)',
      colores_surtido: ['VERDE OLIVA', 'VERDE EUCALIPTO'],
      foto_url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=500&auto=format&fit=crop&q=60',
      id_categoria: categoriasCreadas[2].id_categoria,
      esFlor: false,
    },
    {
      codigo: 'LIL-M05',
      tipo_flor: 'Lirio',
      material: 'Seda Premium',
      composicion: 'Poliéster Soft',
      presentacion: 'Ramo',
      numero_cabezas: 6,
      tamano: '12x22',
      unidades_por_caja: 18,
      stock_principal: 120,
      stock_minimo: 12,
      descripcion: 'RAMO DE LIRIO SEDA PREMIUM DE 6 CABEZAS 12X22 (CAJA X 18 UNID)',
      colores_surtido: ['BLANCO', 'AMARILLO', 'ROSADO'],
      foto_url: 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=500&auto=format&fit=crop&q=60',
      id_categoria: categoriasCreadas[0].id_categoria,
      esFlor: true,
    },
    {
      codigo: 'ORQ-PREM1',
      tipo_flor: 'Orquídea',
      material: 'Látex Real Touch',
      composicion: 'Polímero Tacto Real',
      presentacion: 'Vara',
      numero_cabezas: 8,
      tamano: '15x45',
      unidades_por_caja: 12,
      stock_principal: 60,
      stock_minimo: 5,
      descripcion: 'VARA DE ORQUÍDEA LÁTEX REAL TOUCH DE 8 CABEZAS 15X45 (CAJA X 12 UNID)',
      colores_surtido: ['BLANCO', 'MORADO', 'FUSCIA'],
      foto_url: 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?w=500&auto=format&fit=crop&q=60',
      id_categoria: categoriasCreadas[1].id_categoria,
      esFlor: true,
    },
  ];

  const distStock = [0.55, 0.20, 0.15, 0.10];

  for (const prodData of productosData) {
    const { esFlor, ...dataProducto } = prodData;

    // 3.1 Upsert Producto
    const prod = await prisma.producto.upsert({
      where: { codigo: dataProducto.codigo },
      update: {
        ...dataProducto,
        stock_total: dataProducto.stock_principal,
      },
      create: {
        ...dataProducto,
        stock_total: dataProducto.stock_principal,
      },
    });

    // 3.2 Llenar PreciosActuales (6 Precios por Producto)
    const precios = generar6Precios(esFlor);

    await prisma.preciosActuales.upsert({
      where: { id_producto: prod.id_producto },
      update: precios,
      create: {
        id_producto: prod.id_producto,
        ...precios,
      },
    });

    // 3.3 Generar HistorialPrecios Inicial
    await prisma.historialPrecios.create({
      data: {
        id_producto: prod.id_producto,
        campo_modificado: 'CREACION_INICIAL_SEED',
        valor_anterior: 0,
        valor_nuevo: precios.precio_unidad_normal,
        id_usuario: null,
      },
    });

    // 3.4 Llenar StockActual repartido en los almacenes
    for (let i = 0; i < almacenesCreados.length; i++) {
      const alm = almacenesCreados[i];
      const cantidadAlm = Math.round(prod.stock_principal * distStock[i]);

      await prisma.stockActual.upsert({
        where: {
          id_producto_id_almacen: {
            id_producto: prod.id_producto,
            id_almacen: alm.id_almacen,
          },
        },
        update: { cantidad: cantidadAlm },
        create: {
          id_producto: prod.id_producto,
          id_almacen: alm.id_almacen,
          cantidad: cantidadAlm,
        },
      });
    }
  }

  console.log(` ${productosData.length} Productos sembrados con los 6 tipos de precios y stock por almacén.`);

  // 4. Usuario Administrador
  const adminExiste = await prisma.usuario.findFirst({
    where: { email: 'admin@goldcontinent.com' },
  });

  if (!adminExiste) {
    await prisma.usuario.create({
      data: {
        nombre: 'Administrador Sistema',
        email: 'admin@goldcontinent.com',
        password_hash: '$2b$10$EpRvmMG5bWg71f2N.uBf9.k9YkK5Kx/dG1e.7xG.L9k9',
        rol: Rol.admin,
        activo: true,
      },
    });
    console.log(' Usuario Administrador inicial creado (admin@goldcontinent.com)');
  }

  console.log('🎉 Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error(' Error ejecutando el seed:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });