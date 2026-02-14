import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { logger } from '../config/logger.js';

morgan.token('request-id', (req: Request) => req.requestId || '-');

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error('Error', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    err,
  });

  const statusCode = err.statusCode || 500;
  const message =
    statusCode >= 500
      ? 'Internal server error'
      : err.message || 'Request failed';

  res.status(statusCode).json({
    success: false,
    error: message,
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
    requestId: req.requestId,
  });
}

export function requestLogger() {
  // Like "combined" but with request id prepended.
  const format =
    ':request-id :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

  return morgan(format, {
    stream: {
      write: (message: string) => logger.info(message),
    },
  });
}
