import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

function sanitizeIncomingId(raw: unknown): string | null {
  if (raw == null) return null;
  const v = String(raw).trim();
  if (!v) return null;
  if (v.length > 128) return null;
  // Allow common request-id formats (uuid, trace ids, etc.)
  if (!/^[a-zA-Z0-9._\-:]+$/.test(v)) return null;
  return v;
}

export function requestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = sanitizeIncomingId(req.header('x-request-id'));
    const requestId = incoming || randomUUID();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    next();
  };
}
