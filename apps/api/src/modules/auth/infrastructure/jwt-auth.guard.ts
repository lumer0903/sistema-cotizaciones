import { Injectable, Inject, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { puede } from '@goldcontinent/shared/auth/rbac';
import { PERMISSION_KEY, PermissionRequirement } from '../../../common/decorators/permission.decorator';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) { super(); }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const req = context.switchToHttp().getRequest();
    const rule = this.reflector.getAllAndOverride<PermissionRequirement>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (rule && !puede(req.user, rule.modulo, rule.nivel ?? (['GET', 'HEAD'].includes(req.method) ? 'lectura' : 'edicion'))) {
      throw new ForbiddenException('No tienes permiso para esta operación');
    }
    return true;
  }
}
