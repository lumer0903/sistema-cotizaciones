const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateFotoUrls() {
  console.log('Updating foto_url to product-images bucket URLs...');
  
  // Get all products with their current foto_url
  const products = await prisma.producto.findMany({
    select: {
      id_producto: true,
      codigo: true,
      foto_url: true,
    },
  });
  
  console.log(`Found ${products.length} products`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const product of products) {
    // Skip if already has a valid URL (starts with http)
    if (product.foto_url && product.foto_url.startsWith('http')) {
      skipped++;
      continue;
    }
    
    // Determine the file extension from the codigo or use .png as default
    // The format should be: http://localhost:9000/product-images/{codigo}.png
    const extension = '.png'; // Default extension
    const newUrl = `http://localhost:9000/product-images/${product.codigo}${extension}`;
    
    try {
      await prisma.producto.update({
        where: { id_producto: product.id_producto },
        data: { foto_url: newUrl },
      });
      updated++;
    } catch (error) {
      console.error(`Error updating product ${product.codigo}:`, error.message);
    }
  }
  
  console.log(`\\nUpdated: ${updated}`);
  console.log(`Skipped (already have URL): ${skipped}`);
  console.log(`Total products: ${products.length}`);
  
  await prisma.$disconnect();
}

updateFotoUrls()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  });