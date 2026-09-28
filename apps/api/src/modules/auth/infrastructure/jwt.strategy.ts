import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JWT_CONFIG } from '@goldcontinent/shared/auth/jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.accessToken || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: JWT_CONFIG.ACCESS_TOKEN_SECRET,
    });
  }

  async validate(payload: any) {
    return { 
      id_usuario: payload.id_usuario, 
      email: payload.email, 
      rol: payload.rol 
    };
  }
}
