import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isExemptPath(originalUrl: string): boolean {
  // Never block SuperAdmin tooling or auth flows.
  if (originalUrl.startsWith('/api/superadmin')) return true;
  if (originalUrl.startsWith('/api/auth')) return true;
  return false;
}

export function tenantReadOnlyGuard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const method = String((req as any).method || '').toUpperCase();
  if (!WRITE_METHODS.has(method)) {
    next();
    return;
  }

  const originalUrl = String((req as any).originalUrl || (req as any).url || '');
  if (isExemptPath(originalUrl)) {
    next();
    return;
  }

  if (!req.tenantId) {
    next();
    return;
  }

  if (!req.tenantIsReadOnly) {
    next();
    return;
  }

  const requestId = (req as any)?.requestId;
  res.status(423).json({
    success: false,
    error: 'Tenant is in read-only mode',
    code: 'TENANT_READ_ONLY',
    requestId: requestId || undefined,
  });
}
