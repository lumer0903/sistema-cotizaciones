import { UsuarioAutenticado } from './rbac';

export interface JWTPayload {
  id_usuario: number;
  email: string;
  rol: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenPayload {
  id_usuario: number;
  type: 'refresh';
}

let _accessTokenSecret: string | null = null;
let _refreshTokenSecret: string | null = null;

// Sin fallback: un secreto ausente es un error de configuración, no algo que
// deba ocultarse con un valor por defecto (auditoría C-01/P13).
function getAccessTokenSecret(): string {
  if (!_accessTokenSecret) {
    const val = process.env.JWT_SECRET;
    if (!val) {
      throw new Error(
        'Missing required env var: JWT_SECRET (define .env / variables de entorno; no existe fallback por seguridad)',
      );
    }
    _accessTokenSecret = val;
  }
  return _accessTokenSecret;
}

function getRefreshTokenSecret(): string {
  if (!_refreshTokenSecret) {
    const val = process.env.JWT_REFRESH_SECRET;
    if (!val) {
      throw new Error(
        'Missing required env var: JWT_REFRESH_SECRET (define .env / variables de entorno; no existe fallback por seguridad)',
      );
    }
    _refreshTokenSecret = val;
  }
  return _refreshTokenSecret;
}

export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  get ACCESS_TOKEN_SECRET() {
    return getAccessTokenSecret();
  },
  get REFRESH_TOKEN_SECRET() {
    return getRefreshTokenSecret();
  },
} as const;

export function createAccessTokenPayload(user: UsuarioAutenticado): JWTPayload {
  return {
    id_usuario: user.id_usuario,
    email: user.email,
    rol: user.rol,
  };
}

export type { UsuarioAutenticado } from './rbac';