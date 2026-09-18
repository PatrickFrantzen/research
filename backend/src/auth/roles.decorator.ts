import { SetMetadata } from '@nestjs/common';
import { Rolle } from '../generated/prisma/enums.js';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Rolle[]) => SetMetadata(ROLES_KEY, roles);
