import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO_ROOT, '.minio-data');

function loadEnv() {
  const envPath = path.join(REPO_ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function decodeAwsChunked(buf) {
  const out = [];
  let offset = 0;
  while (offset < buf.length) {
    const lineEnd = buf.indexOf('\r\n', offset);
    if (lineEnd === -1) break;
    const header = buf.slice(offset, lineEnd).toString('utf8');
    const semi = header.indexOf(';');
    const sizeHex = (semi === -1 ? header : header.slice(0, semi)).trim();
    const chunkSize = parseInt(sizeHex, 16);
    if (Number.isNaN(chunkSize)) break;
    offset = lineEnd + 2;
    if (chunkSize === 0) break;
    out.push(buf.slice(offset, offset + chunkSize));
    offset += chunkSize + 2;
  }
  return Buffer.concat(out);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      const isChunked =
        req.headers['x-amz-content-sha256'] === 'STREAMING-AWS4-HMAC-SHA256-PAYLOAD' ||
        (req.headers['content-encoding'] || '').includes('aws-chunked');
      resolve(isChunked ? decodeAwsChunked(raw) : raw);
    });
    req.on('error', reject);
  });
}

function listFilesRecursive(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(full, baseDir));
    } else if (entry.isFile()) {
      const stat = fs.statSync(full);
      results.push({
        key: path.relative(baseDir, full).split(path.sep).join('/'),
        size: stat.size,
        mtime: stat.mtime.toISOString(),
      });
    }
  }
  return results;
}

function resolveSafePath(bucket, key = '') {
  const bucketRoot = path.resolve(DATA_DIR, bucket);
  const target = key ? path.resolve(bucketRoot, ...key.split('/')) : bucketRoot;
  if (target !== bucketRoot && !target.startsWith(bucketRoot + path.sep)) {
    return null;
  }
  return target;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', 'ETag');
}

function startS3Server(port) {
  const server = http.createServer(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${port}`);
    if (url.pathname === '/minio/health/live' || url.pathname === '/minio/health/ready') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
      return;
    }

    const parts = url.pathname.replace(/^\/+/, '').split('/').filter(Boolean);

    // GET / -> listar buckets
    if (parts.length === 0 && req.method === 'GET') {
      const buckets = fs
        .readdirSync(DATA_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map(
          (d) =>
            `<Bucket><Name>${escapeXml(d.name)}</Name><CreationDate>${new Date().toISOString()}</CreationDate></Bucket>`
        )
        .join('');
      const xml = `<?xml version="1.0" encoding="UTF-8"?><ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Buckets>${buckets}</Buckets></ListAllMyBucketsResult>`;
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(xml);
      return;
    }

    const bucket = decodeURIComponent(parts[0]);
    const key = parts.slice(1).map(decodeURIComponent).join('/');
    const targetPath = resolveSafePath(bucket, key);
    if (!targetPath) {
      res.writeHead(400);
      res.end('Invalid path');
      return;
    }

    // Operaciones a nivel de bucket
    if (!key) {
      if (req.method === 'HEAD') {
        res.writeHead(fs.existsSync(targetPath) ? 200 : 404);
        res.end();
        return;
      }
      if (req.method === 'PUT') {
        fs.mkdirSync(targetPath, { recursive: true });
        res.writeHead(url.searchParams.has('policy') ? 204 : 200);
        res.end();
        return;
      }
      if (req.method === 'GET') {
        if (url.searchParams.has('location')) {
          res.writeHead(200, { 'Content-Type': 'application/xml' });
          res.end(
            '<?xml version="1.0" encoding="UTF-8"?><LocationConstraint xmlns="http://s3.amazonaws.com/doc/2006-03-01/">us-east-1</LocationConstraint>'
          );
          return;
        }
        const prefix = url.searchParams.get('prefix') || '';
        const files = listFilesRecursive(targetPath).filter((f) => f.key.startsWith(prefix));
        const contents = files
          .map(
            (f) =>
              `<Contents><Key>${escapeXml(f.key)}</Key><LastModified>${f.mtime}</LastModified><Size>${f.size}</Size></Contents>`
          )
          .join('');
        const xml = `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>${escapeXml(bucket)}</Name><Prefix>${escapeXml(prefix)}</Prefix><IsTruncated>false</IsTruncated>${contents}</ListBucketResult>`;
        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end(xml);
        return;
      }
      if (req.method === 'POST' && url.searchParams.has('delete')) {
        const body = (await readBody(req)).toString('utf8');
        for (const match of body.matchAll(/<Key>(.*?)<\/Key>/g)) {
          const delPath = resolveSafePath(bucket, match[1]);
          if (delPath && fs.existsSync(delPath)) fs.rmSync(delPath, { force: true });
        }
        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end('<?xml version="1.0" encoding="UTF-8"?><DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"></DeleteResult>');
        return;
      }
    }

    // Operaciones a nivel de objeto (archivo)
    if (req.method === 'PUT') {
      const data = await readBody(req);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, data);
      const etag = crypto.createHash('md5').update(data).digest('hex');
      res.writeHead(200, { ETag: `"${etag}"` });
      res.end();
      return;
    }

    if (req.method === 'HEAD' || req.method === 'GET') {
      if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
        res.writeHead(404, { 'Content-Type': 'application/xml' });
        res.end('<Error><Code>NoSuchKey</Code></Error>');
        return;
      }
      const stat = fs.statSync(targetPath);
      res.writeHead(200, {
        'Content-Type': getMimeType(targetPath),
        'Content-Length': stat.size,
        'Last-Modified': stat.mtime.toUTCString(),
        'Cache-Control': 'no-cache',
      });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        fs.createReadStream(targetPath).pipe(res);
      }
      return;
    }

    if (req.method === 'DELETE') {
      if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { force: true });
      res.writeHead(204);
      res.end();
      return;
    }

    res.writeHead(200);
    res.end();
  });

  server.listen(port, () => {
    console.log(`Almacenamiento S3 local listo en http://localhost:${port}`);
  });
}

function startConsoleServer(consolePort, s3Port, buckets) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${consolePort}`);
    if (req.method === 'POST' && url.pathname === '/upload') {
      const bucket = url.searchParams.get('bucket') || 'product-images';
      const filename = path.basename(url.searchParams.get('filename') || '');
      const dest = resolveSafePath(bucket, filename);
      if (!dest || !filename) {
        res.writeHead(400);
        res.end('Archivo invalido');
        return;
      }
      const data = await readBody(req);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, data);
      res.writeHead(200);
      res.end('OK');
      return;
    }

    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Storage Local - Gold Continent</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;color:#0f172a}
.card{border:1px solid #e2e8f0;border-radius:12px;padding:20px;background:#fff}
button{background:#f8b602;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:600;cursor:pointer}
select,input{padding:8px;border:1px solid #cbd5e1;border-radius:8px;margin-right:8px}</style></head>
<body><div class="card"><h2>Subir imágenes de productos (Sin Docker)</h2>
<p>Carpeta local en disco: <code>.minio-data\\product-images\\</code></p>
<select id="bucket">${buckets.map((b) => `<option value="${b}">${b}</option>`).join('')}</select>
<input type="file" id="files" multiple accept="image/*,.pdf" />
<button onclick="upload()">Subir archivos</button>
<p id="status"></p></div>
<script>
async function upload(){
  const bucket=document.getElementById('bucket').value;
  const files=document.getElementById('files').files;
  const status=document.getElementById('status');
  for(let i=0;i<files.length;i++){
    status.textContent='Subiendo '+(i+1)+' de '+files.length+': '+files[i].name;
    await fetch('/upload?bucket='+encodeURIComponent(bucket)+'&filename='+encodeURIComponent(files[i].name),{method:'POST',body:files[i]});
  }
  status.textContent='Listo: '+files.length+' archivo(s) subidos a '+bucket+'. Recarga el ERP.';
}
</script></body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  server.listen(consolePort, () => {
    console.log(`Consola de carga de imagenes en http://localhost:${consolePort}`);
  });
}

loadEnv();
const s3Port = Number(process.env.STORAGE_PORT || process.env.MINIO_PORT || 9000);
const consolePort = Number(process.env.MINIO_CONSOLE_PORT || 9001);
const mainBucket = process.env.STORAGE_BUCKET || process.env.MINIO_BUCKET || 'goldcontinent-media';
const buckets = Array.from(new Set(['product-images', mainBucket]));

for (const b of buckets) {
  fs.mkdirSync(path.join(DATA_DIR, b), { recursive: true });
}

startS3Server(s3Port);
startConsoleServer(consolePort, s3Port, buckets);