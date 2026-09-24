import { SetMetadata } from '@nestjs/common';
import { Rol } from '@goldcontinent/shared/constants/enums';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
