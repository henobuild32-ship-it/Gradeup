import { NextRequest } from 'next/server';
import { verifyAccessToken, ACCESS_COOKIE } from './jwt';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.status = status;
    this.name = 'AuthError';
  }
}

export interface AuthUser {
  userId: string;
  schoolId: string;
  role: string;
  name: string;
}

export function authenticateRequest(req: NextRequest): AuthUser {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) throw new AuthError('Non authentifié. Veuillez vous connecter.', 401);

  const claims = verifyAccessToken(token);
  if (!claims) throw new AuthError('Session expirée ou invalide. Veuillez vous reconnecter.', 401);

  return {
    userId: claims.sub,
    schoolId: claims.schoolId,
    role: claims.role,
    name: claims.name,
  };
}
