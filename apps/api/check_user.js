const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.usuario.findUnique({
      where: { email: 'admin@goldcontinent.com' }
    });
    console.log('User:', user);
    
    const isValid = await bcrypt.compare('admin123', user.password_hash);
    console.log('Password valid for admin123:', isValid);
    
    const isValid2 = await bcrypt.compare('admin', user.password_hash);
    console.log('Password valid for admin:', isValid2);
    
    const isValid3 = await bcrypt.compare('123456', user.password_hash);
    console.log('Password valid for 123456:', isValid3);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();