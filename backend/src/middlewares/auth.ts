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
  }

  next();
}

export function plantMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const { plantId } = req.params;

  if (plantId && req.user) {
    // SuperAdmin can access any plant
    if (req.user.role === 'superadmin') {
      req.plantId = plantId;
      next();
      return;
    }

    // Check if user has access to this plant
    if (
      req.user.plantIds &&
      !req.user.plantIds.includes(plantId) &&
      req.user.role !== 'admin_empresa'
    ) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this plant',
      });
      return;
    }

    req.plantId = plantId;
  }

  next();
}
