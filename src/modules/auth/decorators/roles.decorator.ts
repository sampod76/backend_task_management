import { SetMetadata } from '@nestjs/common';
import { Role } from 'src/modules/user/user.types';

// https://www.notion.so/sampod/Custom-Decorator-2cd7a1bce8f58041bb7ec0de9c1af18f?source=copy_link
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
