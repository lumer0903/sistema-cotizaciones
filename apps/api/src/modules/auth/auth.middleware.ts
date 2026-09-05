import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './auth.service';
import { AppError } from '../../common/middleware/errorHandler';
import { UsuarioAutenticado } from '@goldcontinent/shared/auth';

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

export async function autenticarToken(req: Request, res: Response, next: NextFunction) {
  const accessToken = req.cookies?.accessToken;

  if (!accessToken) {
    throw new AppError('Token no enviado', 401);
  }

  try {
    const payload = verifyAccessToken(accessToken);
    const usuario = await obtenerSesion(payload.id_usuario);

    req.usuario = {
      id_usuario: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
    };

    next();
  } catch (error) {
    next(error);
  }
}

import { obtenerSesion } from './auth.service';

export function requireRoles(...rolesPermitidos: UsuarioAutenticado['rol'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      throw new AppError('No autenticado', 401);
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      throw new AppError('No tiene permisos para acceder a este recurso', 403);
    }

    next();
  };
}

export const soloAdmin = requireRoles('admin');
export const soloAdminGerente = requireRoles('admin', 'gerente');