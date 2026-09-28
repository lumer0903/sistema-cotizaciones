import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Cargar el .env de la raíz del monorepo ANTES de que el middleware (runtime
// node) lea process.env: JWT_SECRET/JWT_REFRESH_SECRET viven ahí en dev.
// En producción los valores llegan como variables de entorno reales y dotenv
// no los pisa (no hace override por defecto).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(__dirname, '../../.env') });
loadDotenv({ path: path.resolve(__dirname, '../.env') });

/** Host permitido para imágenes de la API según NEXT_PUBLIC_API_URL (build). */
const imageRemotePatterns = [
  { protocol: 'http', hostname: 'localhost', port: '3001' },
  { protocol: 'http', hostname: 'localhost', port: '9000' },
  { protocol: 'https', hostname: 'placehold.co' },
];
try {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    const u = new URL(apiUrl);
    if (u.hostname && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') {
      imageRemotePatterns.push({
        protocol: u.protocol === 'http:' ? 'http' : 'https',
        hostname: u.hostname,
        ...(u.port ? { port: u.port } : {}),
      });
    }
  }
} catch {
  // URL inválida: se mantienen solo los patrones por defecto.
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@goldcontinent/shared'],
  // Imagen mínima para producción (Docker/Fly): standalone + assets copiados aparte.
  output: 'standalone',
  images: {
    // Imágenes de productos/avatares servidas por la API (hostname variable
    // según entorno) y placeholders externos (placehold.co).
    remotePatterns: imageRemotePatterns,
    // Logos del login son SVG locales: next/image exige habilitarlo.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;