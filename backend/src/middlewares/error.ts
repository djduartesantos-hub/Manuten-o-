import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { logger } from '../config/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error('Error', {
    requestId: req.requestId,
    error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' && { details: err.stack }),
  });
}

export function notFoundHandler(
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
}

export function requestLogger() {
  morgan.token('requestId', (req: Request) => String(req.requestId || '-'));

  const combinedWithRequestId =
    ':requestId :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

  return morgan(combinedWithRequestId, {
    stream: {
      write: (message: string) => logger.info(message),
    },
  });
}
