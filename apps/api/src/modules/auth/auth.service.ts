import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../common/config/prisma';
import { AppError } from '../../common/middleware/errorHandler';
import { JWT_CONFIG, JWTPayload, TokenPair, createAccessTokenPayload } from '@goldcontinent/shared/auth/jwt';
import { UsuarioAutenticado, Rol } from '@goldcontinent/shared/auth';

const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret';

function quitarDatosSensibles(usuario: { password_hash: string; [key: string]: any }) {
  const { password_hash, ...usuarioSeguro } = usuario;
  return usuarioSeguro;
}

function crearAccessToken(usuario: UsuarioAutenticado): string {
  const payload = createAccessTokenPayload(usuario);
  return jwt.sign(payload, JWT_CONFIG.ACCESS_TOKEN_SECRET, { expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY });
}

function crearRefreshToken(idUsuario: number): string {
  const payload = { id_usuario: idUsuario, type: 'refresh' as const };
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY });
}

export async function login(email: string, password: string): Promise<{ tokenPair: TokenPair; usuario: UsuarioAutenticado }> {
  const usuario = await prisma.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!usuario || !usuario.activo) {
    throw new AppError('Credenciales incorrectas', 401);
  }

  const passwordValido = await bcrypt.compare(password, usuario.password_hash);

  if (!passwordValido) {
    throw new AppError('Credenciales incorrectas', 401);
  }

  const usuarioSeguro = quitarDatosSensibles(usuario);
  const usuarioAutenticado: UsuarioAutenticado = {
    id_usuario: usuarioSeguro.id_usuario,
    email: usuarioSeguro.email,
    rol: usuarioSeguro.rol,
    nombre: usuarioSeguro.nombre,
  };

  const accessToken = crearAccessToken(usuarioAutenticado);
  const refreshToken = crearRefreshToken(usuarioSeguro.id_usuario);

  await prisma.usuario.update({
    where: { id_usuario: usuarioSeguro.id_usuario },
    data: { refresh_token_hash: await bcrypt.hash(refreshToken, 10) },
  });

  return {
    tokenPair: { accessToken, refreshToken },
    usuario: usuarioAutenticado,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenPair> {
  let payload: { id_usuario: number; type: string };
  try {
    payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { id_usuario: number; type: string };
  } catch {
    throw new AppError('Refresh token inválido o expirado', 401);
  }

  if (payload.type !== 'refresh') {
    throw new AppError('Token inválido', 401);
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: payload.id_usuario },
  });

  if (!usuario || !usuario.activo || !usuario.refresh_token_hash) {
    throw new AppError('Sesión no válida', 401);
  }

  const refreshTokenValido = await bcrypt.compare(refreshToken, usuario.refresh_token_hash);
  if (!refreshTokenValido) {
    throw new AppError('Refresh token inválido', 401);
  }

  const usuarioSeguro = quitarDatosSensibles(usuario);
  const usuarioAutenticado: UsuarioAutenticado = {
    id_usuario: usuarioSeguro.id_usuario,
    email: usuarioSeguro.email,
    rol: usuarioSeguro.rol,
    nombre: usuarioSeguro.nombre,
  };

  const newAccessToken = crearAccessToken(usuarioAutenticado);
  const newRefreshToken = crearRefreshToken(usuarioSeguro.id_usuario);

  await prisma.usuario.update({
    where: { id_usuario: usuarioSeguro.id_usuario },
    data: { refresh_token_hash: await bcrypt.hash(newRefreshToken, 10) },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(idUsuario: number): Promise<void> {
  await prisma.usuario.update({
    where: { id_usuario: idUsuario },
    data: { refresh_token_hash: null },
  });
}

export async function obtenerSesion(idUsuario: number): Promise<UsuarioAutenticado> {
  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: idUsuario },
  });

  if (!usuario || !usuario.activo) {
    throw new AppError('Sesión no válida', 401);
  }

  const usuarioSeguro = quitarDatosSensibles(usuario);
  return {
    id_usuario: usuarioSeguro.id_usuario,
    email: usuarioSeguro.email,
    rol: usuarioSeguro.rol,
    nombre: usuarioSeguro.nombre,
  };
}

export async function changePassword(idUsuario: number, currentPassword: string, newPassword: string): Promise<void> {
  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: idUsuario },
  });

  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  const passwordValido = await bcrypt.compare(currentPassword, usuario.password_hash);
  if (!passwordValido) {
    throw new AppError('Contraseña actual incorrecta', 401);
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await prisma.usuario.update({
    where: { id_usuario: idUsuario },
    data: { password_hash: newPasswordHash },
  });
}

export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_CONFIG.ACCESS_TOKEN_SECRET) as JWTPayload;
  } catch {
    throw new AppError('Token inválido o expirado', 401);
  }
}