import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/** Validate request body/params/query against a Zod schema */
export function validate(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(422).json({
          error: 'Validation failed',
          issues: err.flatten().fieldErrors,
        });
        return;
      }
      next(err);
    }
  };
}
