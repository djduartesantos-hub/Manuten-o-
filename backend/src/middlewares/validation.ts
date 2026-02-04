import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { logger } from '../config/logger';

export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      logger.error('Validation error:', error);
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors || error.message,
      });
    }
  };
}
