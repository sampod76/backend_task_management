import type { Request } from 'express';
import { Role } from 'src/modules/user/user.types';

export type AuthPayload = {
  userId: string;
  role: Role;
};

export type AuthenticatedRequest = Request & {
  user?: AuthPayload;
  requestId?: string;
  requestStart?: number;
};
