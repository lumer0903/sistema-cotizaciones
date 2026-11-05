import { createHash, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../common/config/prisma';
import { AppError } from '../../common/middleware/errorHandler';
import { JWT_CONFIG, JWTPayload, TokenPair, createAccessTokenPayload } from '@goldcontinent/shared/auth/jwt';
import { UsuarioAutenticado, MapaPermisos, OverridesPermisos } from '@goldcontinent/shared/auth';
import { PermisoModulo, NivelPermiso, Rol } from '@goldcontinent/shared/constants/enums';
import { DEFAULT_ROLE_PERMISSIONS, esMatrizBloqueada, matrizSiempreEdicion } from '@goldcontinent/shared/auth/rbac';

const REFRESH_TOKEN_SECRET = JWT_CONFIG.REFRESH_TOKEN_SECRET;

function quitarDatosSensibles(usuario: { password_hash: string; [key: string]: any }) {
  const { password_hash, ...usuarioSeguro } = usuario;
  void password_hash;
  return usuarioSeguro;
}

/**
 * Permisos EFECTIVOS del usuario = matriz del rol en DB (rol_permisos)
 * sobrescrita por los overrides personalizados (usuario_permisos).
 * Es lo que viaja en la sesión y alimenta el menú lateral y las vistas.
 */
export async function cargarPermisosEfectivos(idUsuario: number, rol: string, db = prisma): Promise<MapaPermisos> {
  if (esMatrizBloqueada(rol)) {
    return matrizSiempreEdicion();
  }

  const [rolRow, overrideRows] = await Promise.all([
    db.rol.findUnique({ where: { codigo: rol }, select: { id_rol: true } }),
    db.usuarioPermiso.findMany({ where: { id_usuario: idUsuario } }),
  ]);

  const defaults = DEFAULT_ROLE_PERMISSIONS[rol as Rol];
  const efectivos = {} as MapaPermisos;

  const matrizRol = rolRow
    ? await db.rolPermiso.findMany({ where: { id_rol: rolRow.id_rol } })
    : [];

  for (const modulo of Object.values(PermisoModulo)) {
    const fila = matrizRol.find((r) => r.modulo === modulo);
    const override = overrideRows.find((r) => r.modulo === modulo);
    efectivos[modulo] =
      (override?.nivel as NivelPermiso) ??
      (fila?.nivel as NivelPermiso) ??
      defaults?.[modulo] ??
      'sin_acceso';
  }

  return efectivos;
}

/** Solo los overrides personalizados (para el modal de permisos por usuario). */
export async function cargarOverridesPermisos(idUsuario: number): Promise<OverridesPermisos> {
  const rows = await prisma.usuarioPermiso.findMany({ where: { id_usuario: idUsuario } });
  const overrides: OverridesPermisos = {};
  for (const row of rows) {
    overrides[row.modulo as PermisoModulo] = row.nivel as NivelPermiso;
  }
  return overrides;
}

function crearAccessToken(usuario: UsuarioAutenticado, version: number): string {
  const payload = createAccessTokenPayload(usuario);
  return jwt.sign({ ...payload, session_version: version }, JWT_CONFIG.ACCESS_TOKEN_SECRET, { expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY });
}

function crearRefreshToken(idUsuario: number, version: number): string {
  const payload = { id_usuario: idUsuario, type: 'refresh' as const, session_version: version, jti: randomUUID() };
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY });
}

export async function login(email: string, password: string): Promise<{ tokenPair: TokenPair; usuario: UsuarioAutenticado }> {
  const usuario = await prisma.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!usuario || !usuario.activo || usuario.deleted_at) {
    throw new AppError('Credenciales incorrectas', 401);
  }

  const role = await prisma.rol.findUnique({ where: { codigo: usuario.rol } });
  if (!role?.activo) throw new AppError('Credenciales incorrectas', 401);
  const passwordValido = await bcrypt.compare(password, usuario.password_hash);

  if (!passwordValido) {
    throw new AppError('Credenciales incorrectas', 401);
  }

  const usuarioSeguro = quitarDatosSensibles(usuario);
  const permisos = await cargarPermisosEfectivos(usuarioSeguro.id_usuario, usuarioSeguro.rol);
  const usuarioAutenticado: UsuarioAutenticado = {
    id_usuario: usuarioSeguro.id_usuario,
    email: usuarioSeguro.email,
    rol: usuarioSeguro.rol,
    nombre: usuarioSeguro.nombre,
    avatar_url: usuarioSeguro.avatar_url ?? null,
    permisos,
  };

  const accessToken = crearAccessToken(usuarioAutenticado, usuario.session_version);
  const refreshToken = crearRefreshToken(usuarioSeguro.id_usuario, usuario.session_version);

  await prisma.usuario.update({
    where: { id_usuario: usuarioSeguro.id_usuario },
    data: { refresh_token_hash: createHash('sha256').update(refreshToken).digest('hex') },
  });

  return {
    tokenPair: { accessToken, refreshToken },
    usuario: usuarioAutenticado,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenPair> {
  let payload: { id_usuario: number; type: string; session_version: number };
  try {
    payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { id_usuario: number; type: string; session_version: number };
  } catch {
    throw new AppError('Refresh token inválido o expirado', 401);
  }

  if (payload.type !== 'refresh') {
    throw new AppError('Token inválido', 401);
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: payload.id_usuario },
  });

  if (!usuario || !usuario.activo || !usuario.refresh_token_hash || usuario.deleted_at || payload.session_version !== usuario.session_version) {
    throw new AppError('Sesión no válida', 401);
  }

  const refreshTokenValido = createHash('sha256').update(refreshToken).digest('hex') === usuario.refresh_token_hash;
  if (!refreshTokenValido) {
    throw new AppError('Refresh token inválido', 401);
  }

  const usuarioSeguro = quitarDatosSensibles(usuario);
  const permisos = await cargarPermisosEfectivos(usuarioSeguro.id_usuario, usuarioSeguro.rol);
  const usuarioAutenticado: UsuarioAutenticado = {
    id_usuario: usuarioSeguro.id_usuario,
    email: usuarioSeguro.email,
    rol: usuarioSeguro.rol,
    nombre: usuarioSeguro.nombre,
    avatar_url: usuarioSeguro.avatar_url ?? null,
    permisos,
  };

  const newAccessToken = crearAccessToken(usuarioAutenticado, usuario.session_version);
  const newRefreshToken = crearRefreshToken(usuarioSeguro.id_usuario, usuario.session_version);

  const rotated = await prisma.usuario.updateMany({
    where: { id_usuario: usuarioSeguro.id_usuario, refresh_token_hash: usuario.refresh_token_hash, session_version: usuario.session_version },
    data: { refresh_token_hash: createHash('sha256').update(newRefreshToken).digest('hex') },
  });
  if (rotated.count !== 1) throw new AppError('Sesión renovada por otra solicitud', 401);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(idUsuario: number): Promise<void> {
  await prisma.usuario.update({
    where: { id_usuario: idUsuario },
    data: { refresh_token_hash: null, session_version: { increment: 1 } },
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
  const permisos = await cargarPermisosEfectivos(usuarioSeguro.id_usuario, usuarioSeguro.rol);
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
    data: { password_hash: newPasswordHash, refresh_token_hash: null, session_version: { increment: 1 } },
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