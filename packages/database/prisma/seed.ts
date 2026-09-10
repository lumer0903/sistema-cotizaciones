import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de la base de datos...');

  // 1. Insertar usuario admin
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  await prisma.usuario.upsert({
    where: { email: 'admin@goldcontinent.com' },
    update: {
      password_hash: passwordHash,
      rol: 'admin',
    },
    create: {
      nombre: 'Admin General',
      email: 'admin@goldcontinent.com',
      password_hash: passwordHash,
      rol: 'admin',
      activo: true,
    },
  });
  console.log('Usuario admin creado o actualizado.');

  // 2. Crear categoría general (opcional, pero útil)
  let categoria = await prisma.categoria.findFirst();
  if (!categoria) {
    categoria = await prisma.categoria.create({
      data: { nombre_categoria: 'General' },
    });
  }

  // 3. Crear productos de prueba para el recomendador
  await prisma.producto.upsert({
    where: { codigo: 'PRD-001' },
    update: {},
    create: {
      codigo: 'PRD-001',
      descripcion: 'Rosa roja por unidad',
      id_categoria: categoria.id_categoria,
      stock_total: 100,
      activo: true,
      precios_actuales: {
        create: {
          precio_unidad_normal: 5.0,
        }
      }
    },
  });

  await prisma.producto.upsert({
    where: { codigo: 'PRD-002' },
    update: {},
    create: {
      codigo: 'PRD-002',
      descripcion: 'Ramo de 12 rosas rojas',
      id_categoria: categoria.id_categoria,
      stock_total: 50,
      activo: true,
      precios_actuales: {
        create: {
          precio_unidad_normal: 45.0,
        }
      }
    },
  });
  console.log('Productos de prueba creados.');

  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
