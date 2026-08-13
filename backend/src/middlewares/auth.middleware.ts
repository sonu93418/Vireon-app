// ============================================================
// VIREON — AUTHENTICATION MIDDLEWARE
// JWT access token verification + req.user population
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtAccessPayload } from '../utils/jwt.util';
import { UnauthorizedError } from '../core/errors';
import type { UserRole } from '../shared';

// Extend Express Request with typed user
declare global {
  namespace Express {
    interface Request {
      user?: JwtAccessPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Invalid authorization header format');
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication — does not throw if token is absent
export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        req.user = verifyAccessToken(token);
      }
    }
  } catch {
    // Silently ignore auth errors for optional auth
  }
  next();
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new (require('../core/errors').ForbiddenError)(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
};
