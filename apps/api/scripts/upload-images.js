const Minio = require('minio');
const fs = require('fs');
const path = require('path');

const minioClient = new Minio.Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
});

const imagesDir = 'C:\\Users\\REYNA\\Desktop\\sistema-cotizaciones\\IMAGENES-FLORES';

console.log(`Starting upload of images from ${imagesDir}`);

const files = fs.readdirSync(imagesDir);
console.log(`Found ${files.length} files in directory`);

let uploaded = 0;
let failed = 0;

const allowedExt = ['.jpg', '.jpeg', '.png', '.webp'];

files.forEach(file => {
  const filePath = path.join(imagesDir, file);
  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) return;
    
    const ext = path.extname(file).toLowerCase();
    if (!allowedExt.includes(ext)) {
      failed++;
      console.log(`Skipping ${file}: invalid extension ${ext}`);
      return;
    }
    
    const timestamp = Date.now();
    const safeFilename = file.replace(/\s+/g, '-');
    const filename = `${timestamp}-${safeFilename}`;
    const key = `productos/${filename}`;
    
    const fileBuffer = fs.readFileSync(filePath);
    const contentType = ext === '.jpg' || ext === '.jpeg' 
      ? 'image/jpeg' 
      : ext === '.png' ? 'image/png' 
      : ext === '.webp' ? 'image/webp' 
      : 'application/octet-stream';
    
    minioClient.putObject('goldcontinent-media', key, fileBuffer, fileBuffer.length, {
      'Content-Type': contentType
    }).then(() => {
      uploaded++;
      process.stdout.write(`\rUploaded: ${uploaded} ${failed} failed      `);
    }).catch(err => {
      failed++;
      process.stdout.write(`\rFailed: ${failed}          `);
      console.error(`Error uploading ${file}:`, err.message);
    });
  } catch (e) {
    failed++;
    console.error(`Error scanning ${file}:`, e.message);
  }
});

setTimeout(() => {
  process.stdout.write('\n');
  console.log(`\n=== Upload Complete ===`);
  console.log(`Uploaded: ${uploaded} images`);
  console.log(`Failed: ${failed} images`);
  console.log(`Total: ${uploaded + failed} files processed`);
  process.exit(0);
}, 5000);