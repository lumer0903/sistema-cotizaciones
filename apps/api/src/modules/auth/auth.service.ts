import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../common/config/prisma';
import { AppError } from '../../common/middleware/errorHandler';
import { JWT_CONFIG, JWTPayload, TokenPair, createAccessTokenPayload } from '@goldcontinent/shared/auth/jwt';
import { UsuarioAutenticado } from '@goldcontinent/shared/auth';

const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret';

function quitarDatosSensibles(usuario: { password_hash: string; [key: string]: any }) {
  const { password_hash, ...usuarioSeguro } = usuario;
  return usuarioSeguro;
}

async function cargarOverridesPermisos(idUsuario: number) {
  const rows = await prisma.usuarioPermiso.findMany({ where: { id_usuario: idUsuario } });
  const overrides: Record<string, string> = {};
  for (const row of rows) {
    overrides[row.modulo] = row.nivel;
  }
  return overrides;
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

  if (!usuario || !usuario.activo || usuario.deleted_at) {
    throw new AppError('Credenciales incorrectas', 401);
  }

  const passwordValido = await bcrypt.compare(password, usuario.password_hash);

  if (!passwordValido) {
    throw new AppError('Credenciales incorrectas', 401);
  }

  const usuarioSeguro = quitarDatosSensibles(usuario);
  const permisos = await cargarOverridesPermisos(usuarioSeguro.id_usuario);
  const usuarioAutenticado: UsuarioAutenticado = {
    id_usuario: usuarioSeguro.id_usuario,
    email: usuarioSeguro.email,
    rol: usuarioSeguro.rol,
    nombre: usuarioSeguro.nombre,
    avatar_url: usuarioSeguro.avatar_url ?? null,
    permisos,
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

  if (!usuario || !usuario.activo || !usuario.refresh_token_hash || usuario.deleted_at) {
    throw new AppError('Sesión no válida', 401);
  }

  const refreshTokenValido = await bcrypt.compare(refreshToken, usuario.refresh_token_hash);
  if (!refreshTokenValido) {
    throw new AppError('Refresh token inválido', 401);
  }

  const usuarioSeguro = quitarDatosSensibles(usuario);
  const permisos = await cargarOverridesPermisos(usuarioSeguro.id_usuario);
  const usuarioAutenticado: UsuarioAutenticado = {
    id_usuario: usuarioSeguro.id_usuario,
    email: usuarioSeguro.email,
    rol: usuarioSeguro.rol,
    nombre: usuarioSeguro.nombre,
    avatar_url: usuarioSeguro.avatar_url ?? null,
    permisos,
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

  if (!usuario || !usuario.activo || usuario.deleted_at) {
    throw new AppError('Sesión no válida', 401);
  }

  const usuarioSeguro = quitarDatosSensibles(usuario);
  const permisos = await cargarOverridesPermisos(usuarioSeguro.id_usuario);
  return {
    id_usuario: usuarioSeguro.id_usuario,
    email: usuarioSeguro.email,
    rol: usuarioSeguro.rol,
    nombre: usuarioSeguro.nombre,
    avatar_url: usuarioSeguro.avatar_url ?? null,
    permisos,
  };
}

const AVATAR_DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const AVATAR_MAX_BYTES = 512 * 1024;

export async function updateAvatar(idUsuario: number, avatarUrl: string): Promise<UsuarioAutenticado> {
  const value = avatarUrl?.trim() ?? '';
  if (!value) {
    throw new AppError('Imagen de perfil no válida', 400);
  }
  if (!value.startsWith('data:image/')) {
    throw new AppError('La foto debe ser una imagen (data URL)', 400);
  }
  if (!AVATAR_DATA_URL_RE.test(value)) {
    throw new AppError('Formato de imagen no soportado (usa PNG, JPEG o WebP)', 400);
  }
  const approxBytes = Math.floor((value.length * 3) / 4);
  if (approxBytes > AVATAR_MAX_BYTES) {
    throw new AppError('La imagen supera el máximo de 512 KB', 400);
  }

  const usuario = await prisma.usuario.findFirst({
    where: { id_usuario: idUsuario, deleted_at: null, activo: true },
  });
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  await prisma.usuario.update({
    where: { id_usuario: idUsuario },
    data: { avatar_url: value },
  });

  return obtenerSesion(idUsuario);
}

export async function removeAvatar(idUsuario: number): Promise<UsuarioAutenticado> {
  const usuario = await prisma.usuario.findFirst({
    where: { id_usuario: idUsuario, deleted_at: null, activo: true },
  });
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  await prisma.usuario.update({
    where: { id_usuario: idUsuario },
    data: { avatar_url: null },
  });

  return obtenerSesion(idUsuario);
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

export async function updateProfile(
  idUsuario: number,
  data: { nombre?: string; email?: string },
): Promise<UsuarioAutenticado> {
  const usuario = await prisma.usuario.findFirst({
    where: { id_usuario: idUsuario, deleted_at: null, activo: true },
  });
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  const updateData: Record<string, string> = {};

  if (data.nombre !== undefined) {
    const nombre = data.nombre.trim();
    if (nombre.length < 2 || nombre.length > 100) {
      throw new AppError('El nombre debe tener entre 2 y 100 caracteres', 400);
    }
    updateData.nombre = nombre;
  }

  if (data.email !== undefined) {
    const email = data.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Email inválido', 400);
    }
    const existing = await prisma.usuario.findFirst({
      where: { email, id_usuario: { not: idUsuario }, deleted_at: null },
      select: { id_usuario: true },
    });
    if (existing) {
      throw new AppError('El email ya está registrado', 409);
    }
    updateData.email = email;
  }

  if (Object.keys(updateData).length === 0) {
    return obtenerSesion(idUsuario);
  }

  await prisma.usuario.update({
    where: { id_usuario: idUsuario },
    data: updateData,
  });

  return obtenerSesion(idUsuario);
}

export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_CONFIG.ACCESS_TOKEN_SECRET) as JWTPayload;
  } catch {
    throw new AppError('Token inválido o expirado', 401);
  }
}