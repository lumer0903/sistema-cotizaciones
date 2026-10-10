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
console.log('Total:', allImages.length);

const imgByPrefix = new Map();
allImages.forEach(img => {
  const base = normalizeForMatch(img.name);
  const parts = base.split(/[-_]/);
  for (let i = 1; i <= parts.length; i++) {
    const prefix = parts.slice(0, i).join('-');
    if (!imgByPrefix.has(prefix)) imgByPrefix.set(prefix, []);
    imgByPrefix.get(prefix).push(img);
  }
  if (!imgByPrefix.has(base)) imgByPrefix.set(base, []);
  imgByPrefix.get(base).push(img);
});

const testCodes = ['RYG9-J-02', 'RYG18-NU02', 'TLZ-01', 'JLP-28G', 'RYG-01', 'TSJ-01', 'BXM-02', 'JZD-04', 'MS-01', 'RYG5-1'];
testCodes.forEach(code => {
  const imgs = imgByPrefix.get(code);
  if (imgs) {
    console.log(code, '->', imgs[0].name);
  } else {
    console.log(code, '-> NO MATCH');
    const variations = [
      code + '-1', code + '-01', code + '-P', code + '-p',
      code + '-F', code + '-f', code + '-G', code + '-g',
      code + '-J', code + '-j', code + '-R', code + '-r',
      code + '-CH', code + '-ch', code + '-RS', code + '-rs',
      code + '-XM', code + '-XA', code + '-NU', code + '-BJ',
      code + '-LU', code + '-CL', code + '-CM', code + '-CV',
      code + '-RT', code + '-HM', code + '-HO', code + '-OT',
      code + '-B', code + '-b', code + '-C', code + '-c',
      code + '-N', code + '-n', code + '-XS', code + '-xs',
      code + '-A', code + '-a', code + '-M', code + '-m',
    ];
    for (const v of variations) {
      const imgs2 = imgByPrefix.get(v);
      if (imgs2) {
        console.log('  Variation match:', v, '->', imgs2[0].name);
        break;
      }
    }
  }
});