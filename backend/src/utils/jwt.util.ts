// ============================================================
// VIREON — JWT UTILITY
// Access + Refresh token generation & verification
// ============================================================
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../core/errors';
import type { UserRole } from '@vireon/shared';

export interface JwtAccessPayload {
  userId: string;
  role: UserRole;
  type: 'access';
}

export interface JwtRefreshPayload {
  userId: string;
  tokenVersion: number;
  type: 'refresh';
}

const getAccessSecret = (): string => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined');
  return secret;
};

const getRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');
  return secret;
};

export const generateAccessToken = (payload: Omit<JwtAccessPayload, 'type'>): string => {
  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'],
    issuer: 'vireon-safety-institute',
    audience: 'vireon-client',
  };
  return jwt.sign({ ...payload, type: 'access' }, getAccessSecret(), options);
};

export const generateRefreshToken = (
  payload: Omit<JwtRefreshPayload, 'type'>
): string => {
  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as jwt.SignOptions['expiresIn'],
    issuer: 'vireon-safety-institute',
    audience: 'vireon-client',
  };
  return jwt.sign({ ...payload, type: 'refresh' }, getRefreshSecret(), options);
};

export const verifyAccessToken = (token: string): JwtAccessPayload => {
  try {
    const decoded = jwt.verify(token, getAccessSecret(), {
      issuer: 'vireon-safety-institute',
      audience: 'vireon-client',
    }) as JwtAccessPayload;

    if (decoded.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid access token', 'TOKEN_INVALID');
    }
    throw error;
  }
};

export const verifyRefreshToken = (token: string): JwtRefreshPayload => {
  try {
    const decoded = jwt.verify(token, getRefreshSecret(), {
      issuer: 'vireon-safety-institute',
      audience: 'vireon-client',
    }) as JwtRefreshPayload;

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token has expired. Please login again.', 'REFRESH_TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid refresh token', 'REFRESH_TOKEN_INVALID');
    }
    throw error;
  }
};

export const decodeToken = (token: string): jwt.JwtPayload | null => {
  return jwt.decode(token) as jwt.JwtPayload | null;
};
