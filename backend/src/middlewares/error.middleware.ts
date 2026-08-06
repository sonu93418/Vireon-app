// ============================================================
// VIREON — GLOBAL ERROR HANDLING MIDDLEWARE
// Centralized error handler with discriminated error types
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError, ValidationError, HttpStatusCode } from '../core/errors';
import { ResponseHandler } from '../core/response';
import { logger } from '../config/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error({
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // ─── Known Operational Errors ─────────────────────────────
  if (error instanceof ValidationError) {
    ResponseHandler.error(res, error.message, error.statusCode, error.errors, error.code);
    return;
  }

  if (error instanceof AppError && error.isOperational) {
    ResponseHandler.error(res, error.message, error.statusCode, undefined, error.code);
    return;
  }

  // ─── Mongoose Errors ──────────────────────────────────────
  if (error instanceof MongooseError.CastError) {
    ResponseHandler.error(res, `Invalid ${error.path}: ${error.value as string}`, HttpStatusCode.BAD_REQUEST, undefined, 'INVALID_ID');
    return;
  }

  if (error instanceof MongooseError.ValidationError) {
    const errors = Object.values(error.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    ResponseHandler.error(res, 'Validation failed', HttpStatusCode.UNPROCESSABLE_ENTITY, errors, 'VALIDATION_ERROR');
    return;
  }

  // MongoDB Duplicate Key Error (code 11000)
  if ((error as unknown as { code?: number | string }).code === 11000 || (error as unknown as { code?: number | string }).code === '11000') {
    const keyValue = (error as unknown as { keyValue?: Record<string, unknown> }).keyValue;
    const duplicateField = Object.keys(keyValue ?? {})[0] ?? 'field';
    ResponseHandler.error(res, `${duplicateField} already exists`, HttpStatusCode.CONFLICT, undefined, 'DUPLICATE_KEY');
    return;
  }

  // ─── JWT Errors ───────────────────────────────────────────
  if (error instanceof TokenExpiredError) {
    ResponseHandler.error(res, 'Token has expired', HttpStatusCode.UNAUTHORIZED, undefined, 'TOKEN_EXPIRED');
    return;
  }

  if (error instanceof JsonWebTokenError) {
    ResponseHandler.error(res, 'Invalid token', HttpStatusCode.UNAUTHORIZED, undefined, 'TOKEN_INVALID');
    return;
  }

  // ─── Unhandled Server Errors ──────────────────────────────
  logger.error('🚨 Unhandled Error:', { error: error.message, stack: error.stack });
  ResponseHandler.error(
    res,
    process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
    HttpStatusCode.INTERNAL_SERVER_ERROR,
    undefined,
    'INTERNAL_SERVER_ERROR'
  );
};

export const notFoundHandler = (req: Request, res: Response): void => {
  ResponseHandler.error(
    res,
    `Route ${req.method} ${req.originalUrl} not found`,
    HttpStatusCode.NOT_FOUND,
    undefined,
    'ROUTE_NOT_FOUND'
  );
};
