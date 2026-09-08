const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function test() {
  try {
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.usuario.update({
      where: { email: 'admin@goldcontinent.com' },
      data: { password_hash: hashedPassword }
    });
    
    console.log('Password updated to:', newPassword);
    console.log('New hash:', hashedPassword);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();