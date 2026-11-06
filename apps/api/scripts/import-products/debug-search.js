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

const allImages = getAllImages('/app/IMAGENES-FLORES');

const testCodes = ['RYG9-J-02', 'RYG18-NU02', 'TLZ-01', 'JLP-28G', 'RYG-01', 'TSJ-01', 'BXM-02', 'JZD-04', 'MS-01', 'RYG5-1', 'RYG5-2', 'RYG5-5', 'RYG9-210', 'RYG10-RS', 'RYG12-LU', 'RYG18-NU02', 'FAR-01', 'TLZ-02', 'TLZ-05', 'JLP-60', 'JLP-60F', 'V-GRS5-01'];

testCodes.forEach(code => {
  const matches = allImages.filter(img => img.name.toLowerCase().includes(code.toLowerCase()));
  if (matches.length > 0) {
    console.log(code, '->', matches.slice(0,3).map(m => m.name).join(', '));
  } else {
    console.log(code, '-> NO MATCH');
  }
});