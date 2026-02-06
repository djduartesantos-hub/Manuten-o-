import { Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyToken } from '../auth/jwt.js';
import { AuthService } from '../services/auth.service.js';
import { AuthenticatedRequest, UserRole } from '../types/index.js';
import { logger } from '../config/logger.js';

const roleAliases: Record<string, UserRole> = {
  admin: UserRole.AdminEmpresa,
  maintenance_manager: UserRole.GestorManutencao,
  planner: UserRole.GestorManutencao,
  technician: UserRole.Tecnico,
};

const normalizeRole = (role?: string | UserRole): UserRole | undefined => {
  if (!role) return undefined;

  const mapped = roleAliases[role] ?? role;
  const allowedRoles = Object.values(UserRole);

  return allowedRoles.includes(mapped as UserRole) ? (mapped as UserRole) : undefined;
};

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

    const normalizedRole = normalizeRole(payload?.role);
    if (normalizedRole) {
      payload.role = normalizedRole;
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

    const userRole = normalizeRole(req.user.role);
    const allowedRoles = roles
      .map((role) => normalizeRole(role))
      .filter((role): role is UserRole => Boolean(role));

    if (!userRole || !allowedRoles.includes(userRole)) {
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

export async function plantMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { plantId } = req.params;

  // If no plantId in params, skip - some routes don't use it
  if (!plantId || plantId.trim() === '') {
    return next();
  }

  // In single-tenant mode: if user is authenticated, they can access any plant
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
    return;
  }

  const tenantId = req.tenantId || req.user.tenantId;

  if (!tenantId) {
    res.status(400).json({
      success: false,
      error: 'Tenant ID is required',
    });
    return;
  }

  try {
    const userRole = normalizeRole(req.user.role);
    let plantIds = req.user.plantIds || [];

    if (plantIds.length === 0) {
      plantIds = await AuthService.getUserPlantIds(req.user.userId, tenantId, userRole);
      req.user.plantIds = plantIds;
    }

    if (!plantIds.includes(plantId)) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this plant',
      });
      return;
    }

    req.plantId = plantId;
    next();
  } catch (error) {
    logger.error('Plant middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Plant authorization error',
    });
  }
}
