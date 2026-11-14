/**
 * Script multiplataforma para iniciar MinIO nativo en Windows
 * Compatible con cmd.exe y PowerShell
 * Ejecuta: pnpm minio (desde package.json raíz)
 * 
 * Funciones:
   - Verifica/descarga minio.exe
   - Carga variables .env con fallback a minioadmin
   - Crea carpeta .minio-data
   - Inicia minio.exe con los parámetros indicados
   - Espera a que el puerto 9000 esté listo
   - Crea buckets públicos requeridos usando el SDK de Minio
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import dotenv from 'dotenv';
import * as Minio from 'minio';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Rutas y configuración
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');
const MINIO_BIN = path.join(REPO_ROOT, '.bin', 'minio.exe');
const MINIO_DATA_DIR = path.join(REPO_ROOT, '.minio-data');
const MINIO_URL = 'http://localhost:9000';
const MINIO_HEALTH_URL = 'http://localhost:9000/minio/health/live';

// Cargar variables .env
const envPath = path.join(REPO_ROOT, '.env');
dotenv.config({ path: envPath });

// Leer variables de MinIO con fallback
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin';
const MINIO_BUCKET = process.env.STORAGE_BUCKET || 'goldcontinent-media';

// Paso 1: Verificar si minio.exe existe, si no, descargarlo
async function ensureMinioBinary() {
  if (fs.existsSync(MINIO_BIN)) {
    console.log('✅ minio.exe encontrado en .bin/minio.exe');
    return;
  }

  console.log('⚡ minio.exe no encontrado, descargando...');
  
  const binDir = path.join(REPO_ROOT, '.bin');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const minioUrl = 'https://dl.min.io/server/minio/release/windows-amd64/minio.exe';
  
  return new Promise((resolve, reject) => {
    const http = require('http');
    const file = fs.createWriteStream(MINIO_BIN);
    const request = http.get(minioUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        console.log('✅ minio.exe descargado exitosamente');
        resolve();
      });
    });
    request.on('error', (err) => {
      fs.unlink(MINIO_BIN);
      reject(err);
    });
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Tiempo de espera agotado descargando minio.exe'));
    });
    request.setTimeout(60000);
  });
}

// Paso 2: Crear carpeta .minio-data si no existe
function ensureDataDirectory() {
  if (!fs.existsSync(MINIO_DATA_DIR)) {
    fs.mkdirSync(MINIO_DATA_DIR, { recursive: true });
    console.log(`📁 Carpeta creada: .minio-data`);
  }
}

// Paso 3: Iniciar minio.exe
function startMinioProcess() {
  const { spawn } = require('child_process');
  
  const env = {
    ...process.env,
    MINIO_ROOT_USER: MINIO_ACCESS_KEY,
    MINIO_ROOT_PASSWORD: MINIO_SECRET_KEY,
  };
  
  console.log(`🚀 Iniciando MinIO...`);
  console.log(`   Servidor: ${MINIO_URL}`);
  console.log(`   Consola: ${MINIO_URL.replace('9000', '9001')}`);
  console.log(`   Datos: ${MINIO_DATA_DIR}`);
  console.log(`   Usuario: ${MINIO_ACCESS_KEY}`);
  
  const child = spawn('minio.exe', [
    'server',
    `.${MINIO_DATA_DIR.replace(REPO_ROOT, '.')}`,
    '--address',
    ':9000',
    '--console-address',
    ':9001'
  ], {
    env: env,
    stdio: 'inherit',
    shell: true
  });
  
  return child;
}

// Paso 4: Esperar a que el puerto 9000 esté listo
async function waitForMinioReady(maxRetries = 30, interval = 2000) {
  console.log('⏳ Esperando a que MinIO esté listo...');
  
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, interval));
    
    return new Promise((resolve, reject) => {
      http.get(MINIO_HEALTH_URL, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ MinIO listo!');
            resolve(true);
          } else {
            console.log(`   Intento ${i + 1}/${maxRetries}: status ${res.statusCode}`);
            resolve(false);
          }
        });
      }).on('error', () => {
        console.log(`   Intento ${i + 1}/${maxRetries}: sin conexión aún`);
        resolve(false);
      });
    });
  }
  
  console.log('❌ MinIO no respondió después de los intentos');
  return false;
}

// Paso 5: Crear buckets públicos
async function createBuckets() {
  console.log('🪣 Creando buckets públicos...');
  
  try {
    const minio = new Minio.Client({
      endPoint: 'localhost',
      port: 9000,
      useSSL: false,
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
    });
    
    const buckets = ['goldcontinent-media', 'product-images'];
    
    for (const bucket of buckets) {
      try {
        const exists = await minio.bucketExists(bucket);
        if (!exists) {
          await minio.makeBucket(bucket);
          console.log(`   ✅ Bucket creado: ${bucket}`);
          
          const policy = {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicReadGetObject',
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: `arn:aws:s3:::${bucket}/*`
              }
            ]
          };
          
          try {
            await minio.setBucketPolicy(bucket, JSON.stringify(policy));
            console.log(`   🔓 Política pública aplicada: ${bucket}`);
          } catch (policyError) {
            console.log(`   ⚠️ No se pudo aplicar política pública a ${bucket}: ${policyError.message}`);
          }
        } else {
          console.log(`   ℹ️ Bucket ya existe: ${bucket}`);
        }
      } catch (bucketError) {
        console.log(`   ❌ Error con bucket ${bucket}: ${bucketError.message}`);
      }
    }
  } catch (error) {
    console.log('⚠️ Nota: No se pudieron crear los buckets automáticamente');
    console.log('   Asegúrate de tener el SDK de Minio instalado');
    console.log(`   Error: ${error.message}`);
  }
}

// Ejecución principal
async function main() {
  console.log('========================================');
  console.log('   Iniciando MinIO nativo sin Docker');
  console.log('========================================');
  
  try {
    await ensureMinioBinary();
    ensureDataDirectory();
    const child = startMinioProcess();
    const isReady = await waitForMinioReady();
    
    if (isReady) {
      await createBuckets();
    }
    
    console.log(`\n🌐 MinIO disponible en:`);
    console.log(`   Servidor: http://localhost:9000`);
    console.log(`   Consola:  http://localhost:9001`);
    console.log(`   Bucket:   ${MINIO_BUCKET}`);
    console.log('\n💡 Presiona Ctrl+C para detener MinIO');
    
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Error crítico al iniciar MinIO:', error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});