// ============================================================
// VIREON — CORE: API RESPONSE HANDLER
// Standardized JSON response formatting
// ============================================================
import { Response } from 'express';
import { HttpStatusCode } from './errors';
import type { ApiResponse, IPaginationMeta, IValidationError } from '@vireon/shared';

export class ResponseHandler {
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = HttpStatusCode.OK
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message = 'Created successfully'): Response {
    return ResponseHandler.success(res, data, message, HttpStatusCode.CREATED);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    meta: IPaginationMeta,
    message = 'Success'
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data,
      meta,
    };
    return res.status(HttpStatusCode.OK).json(response);
  }

  static noContent(res: Response): Response {
    return res.status(HttpStatusCode.NO_CONTENT).send();
  }

  static error(
    res: Response,
    message: string,
    statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR,
    errors?: IValidationError[],
    code?: string
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      errors,
      ...(code ? { code } : {}),
    };
    return res.status(statusCode).json(response);
  }
}
