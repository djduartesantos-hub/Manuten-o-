import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

function normalizeIncomingId(value: unknown): string | null {
  const str = typeof value === 'string' ? value.trim() : '';
  if (!str) return null;
  if (str.length > 128) return null;
  return str;
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = normalizeIncomingId(req.header('x-request-id'));
  const requestId = incoming || randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
}
