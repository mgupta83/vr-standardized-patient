import type { Context, Next } from 'hono';
import type { UserPublic } from '@vr-sp/shared';
import { verifyToken } from '../services/jwt.js';

export type AuthVariables = { user: UserPublic };

export async function authMiddleware(
  c: Context<{ Variables: AuthVariables }>,
  next: Next,
): Promise<Response | void> {
  const authorization = c.req.header('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return c.json(
      { error: 'Unauthorized', message: 'Missing or invalid token', statusCode: 401 },
      401,
    );
  }

  const token = authorization.slice(7);
  try {
    const user = verifyToken(token);
    c.set('user', user);
    await next();
    return;
  } catch {
    return c.json(
      { error: 'Unauthorized', message: 'Invalid or expired token', statusCode: 401 },
      401,
    );
  }
}

export function requireRole(...roles: string[]) {
  return async (
    c: Context<{ Variables: AuthVariables }>,
    next: Next,
  ): Promise<Response | void> => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json(
        { error: 'Forbidden', message: 'Insufficient permissions', statusCode: 403 },
        403,
      );
    }
    await next();
  };
}
