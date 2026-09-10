import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IUserRepository } from '../domain/user.repository.interface';
import { LoginDto } from './login.dto';
import * as bcrypt from 'bcryptjs';
import { createAccessTokenPayload } from '@goldcontinent/shared/auth/jwt';
import { UsuarioAutenticado } from '@goldcontinent/shared/auth';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: LoginDto) {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const usuarioAutenticado: UsuarioAutenticado = {
      id_usuario: user.id_usuario,
      email: user.email,
      rol: user.rol,
      nombre: user.nombre,
    };

    const payload = createAccessTokenPayload(usuarioAutenticado);
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
