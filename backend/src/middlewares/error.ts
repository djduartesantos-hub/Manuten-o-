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
  const code = err.code || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED');

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' && { details: err.stack }),
  });
}

export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    requestId: req.requestId,
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
