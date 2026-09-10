import { Controller, Post, Body, Get, UseGuards, Req, Res, UnauthorizedException, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginUseCase } from '../application/login.use-case';
import { LoginDto } from '../application/login.dto';
import { JwtAuthGuard } from '../infrastructure/jwt-auth.guard';
import { refreshAccessToken, login as loginService, obtenerSesion, logout, changePassword } from '../auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Post('refresh')
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token no enviado');
    }

    try {
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

      return { success: true, message: 'Token renovado' };
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 201, description: 'Returns JWT access token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: any) {
    try {
      const { tokenPair, usuario } = await loginService(loginDto.email, loginDto.password);

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

      return {
        success: true,
        message: 'Inicio de sesión correcto',
        data: { usuario },
      };
    } catch (error: any) {
      throw new UnauthorizedException(error.message || 'Credenciales incorrectas');
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'User logout' })
  @ApiBearerAuth()
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const usuario = req.user;
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

    return {
      success: true,
      message: 'Sesión cerrada correctamente',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  async getProfile(@Req() req: any) {
    const usuario = req.user;
    const sesion = await obtenerSesion(usuario.id_usuario);

    return {
      success: true,
      data: { usuario: sesion },
    };
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change password' })
  @ApiBearerAuth()
  async changePassword(@Req() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    const usuario = req.user;
    await changePassword(usuario.id_usuario, body.currentPassword, body.newPassword);

    return {
      success: true,
      message: 'Contraseña actualizada correctamente',
    };
  }
}
