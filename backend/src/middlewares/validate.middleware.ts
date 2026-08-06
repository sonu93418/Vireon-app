// ============================================================
// VIREON — ZOD VALIDATION MIDDLEWARE
// Generic schema validation for body, query, and params
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { ValidationError } from '../core/errors';

interface ValidateOptions {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export const validate = (schemas: ValidateOptions) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body) as typeof req.body;
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query) as typeof req.query;
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params) as typeof req.params;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new ValidationError(validationErrors));
      } else {
        next(error);
      }
    }
  };
};
