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

function isServerRuntime(): boolean {
  return typeof (globalThis as { window?: unknown }).window === 'undefined';
}

function getAccessTokenSecret(): string {
  if (!_accessTokenSecret) {
    const val = process.env.JWT_SECRET;
    if (!val) {
      if (process.env.NODE_ENV === 'production' && isServerRuntime()) {
        throw new Error('Missing required env var: JWT_SECRET');
      }
      _accessTokenSecret = 'dev-secret-change-in-production';
    } else {
      _accessTokenSecret = val;
    }
  }
  return _accessTokenSecret;
}

function getRefreshTokenSecret(): string {
  if (!_refreshTokenSecret) {
    const val = process.env.JWT_REFRESH_SECRET;
    if (!val) {
      if (process.env.NODE_ENV === 'production' && isServerRuntime()) {
        throw new Error('Missing required env var: JWT_REFRESH_SECRET');
      }
      _refreshTokenSecret = 'dev-secret-change-in-production';
    } else {
      _refreshTokenSecret = val;
    }
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