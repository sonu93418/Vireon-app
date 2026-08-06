// ============================================================
// VIREON — CORE: CUSTOM ERROR CLASSES
// ============================================================

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number, code?: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', code?: string) {
    super(message, HttpStatusCode.BAD_REQUEST, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized. Please log in again.', code?: string) {
    super(message, HttpStatusCode.UNAUTHORIZED, code ?? 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied. Insufficient permissions.', code?: string) {
    super(message, HttpStatusCode.FORBIDDEN, code ?? 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', code?: string) {
    super(`${resource} not found.`, HttpStatusCode.NOT_FOUND, code ?? 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict. Resource already exists.', code?: string) {
    super(message, HttpStatusCode.CONFLICT, code ?? 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(
    errors: Array<{ field: string; message: string }>,
    message = 'Validation failed'
  ) {
    super(message, HttpStatusCode.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, HttpStatusCode.TOO_MANY_REQUESTS, 'TOO_MANY_REQUESTS');
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error') {
    super(message, HttpStatusCode.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', false);
  }
}
