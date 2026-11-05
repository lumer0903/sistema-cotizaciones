const fs = require('fs');
const path = require('path');

function getAllImages(dir) {
  const results = [];
  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (item.match(/\.(jpg|jpeg|png|webp)$/i)) {
        results.push({ name: item, fullPath });
      }
    }
  }
  scanDir(dir);
  return results;
}

function normalizeForMatch(name) {
  return name
    .replace(/\.(jpg|jpeg|png|webp)$/i, '')
    .replace(/^fotos2/gi, '')
    .replace(/[-_]?\d+$/, '')
    .replace(/[-_]?[A-Z]$/, '')
    .trim();
}

const allImages = getAllImages('/app/IMAGENES-FLORES');

// Show first 50 images with their normalized forms
allImages.slice(0, 50).forEach(img => {
  const norm = normalizeForMatch(img.name);
  console.log(img.name, '->', norm);
});