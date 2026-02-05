import { Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyToken } from '../auth/jwt.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logger } from '../config/logger.js';

export function authMiddleware(
  req: AuthenticatedRequest & { headers?: any },
  res: Response,
  next: NextFunction,
): void {
  try {
    const token = extractTokenFromHeader(req.headers?.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    req.user = payload;
    req.tenantId = payload.tenantId;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
}

export function requireRole(...roles: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

export function tenantMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  // Get tenantId from params (e.g., /api/tenants/:tenantId)
  // or use the user's tenantId from JWT (already set in authMiddleware)
  const { tenantId } = req.params;

  if (tenantId && req.user) {
    // SuperAdmin can access any tenant
    if (req.user.role === 'superadmin') {
      req.tenantId = tenantId;
      next();
      return;
    }

    // Other users can only access their own tenant
    if (req.user.tenantId !== tenantId) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this tenant',
      });
      return;
    }

    req.tenantId = tenantId;
  } else if (req.user && !req.tenantId) {
    // Use user's tenantId from JWT if not in params
    req.tenantId = req.user.tenantId;
  }

  next();
}

export function plantMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const { plantId } = req.params;

  if (!plantId) {
    // No plantId in params, continue without restriction
    return next();
  }

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
    return;
  }

  // SuperAdmin can access any plant
  if (req.user.role === 'superadmin') {
    req.plantId = plantId;
    return next();
  }

  // Check if user has access to this plant
  // For now, allow admin_empresa to access any plant in their tenant
  if (req.user.role === 'admin_empresa') {
    req.plantId = plantId;
    return next();
  }

  // For other roles, check if they have explicit access via plantIds
  if (req.user.plantIds && req.user.plantIds.includes(plantId)) {
    req.plantId = plantId;
    return next();
  }

  // Deny access if no specific permission found
  res.status(403).json({
    success: false,
    error: 'Access denied to this plant',
  });
}
