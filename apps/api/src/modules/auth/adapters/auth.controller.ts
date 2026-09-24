import { Controller, Post, Body, Get, UseGuards, Req, Res, UnauthorizedException, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoginUseCase } from '../application/login.use-case';
import { LoginDto } from '../application/login.dto';
import { ChangePasswordDto } from '../application/change-password.dto';
import { JwtAuthGuard } from '../infrastructure/jwt-auth.guard';
import { refreshAccessToken, login as loginService, obtenerSesion, logout, changePassword, updateAvatar, removeAvatar, updateProfile } from '../auth.service';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEmail, MinLength } from 'class-validator';

class UpdateAvatarDto {
  @ApiProperty({
    description: 'Data URL de la imagen (PNG, JPEG o WebP), máx 512 KB',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(700000)
  avatar_url!: string;
}

class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Juan Pérez', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ example: 'juan@ejemplo.com', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}

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
        data: { usuario, access_token: tokenPair.accessToken },
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
  async changePassword(@Req() req: any, @Body() body: ChangePasswordDto) {
    const usuario = req.user;
    await changePassword(usuario.id_usuario, body.currentPassword, body.newPassword);

    return {
      success: true,
      message: 'Contraseña actualizada correctamente',
    };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current user name and/or email' })
  @ApiBearerAuth()
  async updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    const usuario = await updateProfile(req.user.id_usuario, body);
    return {
      success: true,
      message: 'Perfil actualizado correctamente',
      data: { usuario },
    };
  }

  @Patch('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current user profile photo (data URL)' })
  @ApiBearerAuth()
  async updateAvatar(@Req() req: any, @Body() body: UpdateAvatarDto) {
    const usuario = await updateAvatar(req.user.id_usuario, body.avatar_url);
    return {
      success: true,
      message: 'Foto de perfil actualizada correctamente',
      data: { usuario },
    };
  }

  @Delete('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove current user profile photo' })
  @ApiBearerAuth()
  async deleteAvatar(@Req() req: any) {
    const usuario = await removeAvatar(req.user.id_usuario);
    return {
      success: true,
      message: 'Foto de perfil eliminada',
      data: { usuario },
    };
  }
}
