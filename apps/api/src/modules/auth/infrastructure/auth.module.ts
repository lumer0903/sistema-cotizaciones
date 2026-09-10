import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../adapters/auth.controller';
import { LoginUseCase } from '../application/login.use-case';
import { PrismaUserRepository } from './prisma-user.repository';
import { IUserRepository } from '../domain/user.repository.interface';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    JwtStrategy,
    {
      provide: IUserRepository,
      useClass: PrismaUserRepository,
    },
  ],
})
export class AuthModule {}
