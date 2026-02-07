import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from '../config/constants.js';

export async function tenantSlugMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    req.tenantId = DEFAULT_TENANT_ID;
    req.tenantSlug = DEFAULT_TENANT_SLUG;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resolve tenant',
    });
  }
}
