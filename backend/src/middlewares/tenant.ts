import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { AuthService } from '../services/auth.service.js';

export async function tenantSlugMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantSlug = (req.params?.tenantSlug || '').trim().toLowerCase();

    if (!tenantSlug) {
      res.status(400).json({
        success: false,
        error: 'Tenant slug is required',
      });
      return;
    }

    const tenant = await AuthService.findTenantBySlug(tenantSlug);

    if (!tenant) {
      const isSetupInit = req.path.startsWith('/setup/initialize');
      if (isSetupInit) {
        req.tenantSlug = tenantSlug;
        next();
        return;
      }

      res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
      return;
    }

    req.tenantId = tenant.id;
    req.tenantSlug = tenant.slug;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resolve tenant',
    });
  }
}
