import { UsuarioAutenticado } from './rbac';
import { Rol } from '../constants/enums';

export interface JWTPayload {
  id_usuario: number;
  email: string;
  rol: Rol;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenPayload {
  id_usuario: number;
  type: 'refresh';
}

export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  ACCESS_TOKEN_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret',
} as const;

export function createAccessTokenPayload(user: UsuarioAutenticado): JWTPayload {
  return {
    id_usuario: user.id_usuario,
    email: user.email,
    rol: user.rol,
  };
}

export type { UsuarioAutenticado } from './rbac';