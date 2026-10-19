import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JWT_CONFIG } from '@goldcontinent/shared/auth/jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { cargarPermisosEfectivos } from '../auth.service';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({ jwtFromRequest: ExtractJwt.fromExtractors([
      (req: Request) => req?.cookies?.accessToken || null,
      ExtractJwt.fromAuthHeaderAsBearerToken(),
    ]), ignoreExpiration: false, secretOrKey: JWT_CONFIG.ACCESS_TOKEN_SECRET });
  }
  async validate(payload: { id_usuario: number; session_version?: number }) {
    if (!Number.isInteger(payload.id_usuario) || payload.id_usuario <= 0) throw new UnauthorizedException();
    const user = await this.prisma.usuario.findUnique({ where: { id_usuario: payload.id_usuario } });
    if (!user || !user.activo || user.deleted_at || payload.session_version !== user.session_version) {
      throw new UnauthorizedException('Sesión no válida');
    }
    const rol = await this.prisma.rol.findUnique({ where: { codigo: user.rol } });
    if (!rol?.activo) throw new UnauthorizedException('Rol inactivo');
    return { id_usuario: user.id_usuario, email: user.email, rol: user.rol,
      permisos: await cargarPermisosEfectivos(user.id_usuario, user.rol, this.prisma) };
  }
}
