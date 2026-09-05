import { Request, Response, NextFunction } from 'express';
import { login, refreshAccessToken, logout, obtenerSesion, changePassword } from './auth.service';
import { loginSchema, refreshTokenSchema, changePasswordSchema } from '@goldcontinent/shared/schemas/auth';
import { AppError } from '../../common/middleware/errorHandler';

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const { tokenPair, usuario } = await login(data.email, data.password);

    res.cookie('accessToken', tokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      message: 'Inicio de sesión correcto',
      data: { usuario },
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshController(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new AppError('Refresh token no enviado', 401);
    }

    const tokenPair = await refreshAccessToken(refreshToken);

    res.cookie('accessToken', tokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Token renovado',
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutController(req: Request, res: Response, next: NextFunction) {
  try {
    const usuario = (req as any).usuario;
    if (usuario?.id_usuario) {
      await logout(usuario.id_usuario);
    }

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.json({
      success: true,
      message: 'Sesión cerrada correctamente',
    });
  } catch (error) {
    next(error);
  }
}

export async function meController(req: Request, res: Response, next: NextFunction) {
  try {
    const usuario = (req as any).usuario;
    const sesion = await obtenerSesion(usuario.id_usuario);

    res.json({
      success: true,
      data: { usuario: sesion },
    });
  } catch (error) {
    next(error);
  }
}

export async function changePasswordController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = changePasswordSchema.parse(req.body);
    const usuario = (req as any).usuario;
    await changePassword(usuario.id_usuario, data.currentPassword, data.newPassword);

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    next(error);
  }
}