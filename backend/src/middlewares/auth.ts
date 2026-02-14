import { Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyToken } from '../auth/jwt.js';
import { AuthService } from '../services/auth.service.js';
import { AuthenticatedRequest, UserRole } from '../types/index.js';
import { logger } from '../config/logger.js';
import { db } from '../config/database.js';

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

export async function authMiddleware(
  req: AuthenticatedRequest & { headers?: any },
  res: Response,
  next: NextFunction,
): Promise<void> {
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

    // Normalize legacy/variant payload shapes (older tokens)
    // Some earlier versions used `id` / `tenant_id` instead of `userId` / `tenantId`.
    const payloadAny: any = payload as any;
    if (!payloadAny.userId && payloadAny.id) payloadAny.userId = payloadAny.id;
    if (!payloadAny.tenantId && payloadAny.tenant_id) payloadAny.tenantId = payloadAny.tenant_id;

    const normalizedRole = normalizeRole(payloadAny?.role);
    if (normalizedRole) {
      payloadAny.role = normalizedRole;
    }

    // Validate minimum required claims
    if (!payloadAny?.userId || !payloadAny?.tenantId) {
      res.status(401).json({
        success: false,
        error: 'Invalid token payload',
      });
      return;
    }

    if (req.tenantId && req.tenantId !== payloadAny.tenantId) {
      // SuperAdmin can operate across tenants (tenant context may come from middleware/header)
      if (String(payloadAny.role) !== UserRole.SuperAdmin) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this tenant',
        });
        return;
      }
    }

    // Session enforcement (best-effort for backward compatibility)
    // New tokens include sessionId; if present and revoked, block immediately.
    if (payloadAny?.sessionId) {
      const active = await AuthService.isSessionActive(String(payloadAny.sessionId), String(payloadAny.userId));
      if (!active) {
        res.status(401).json({
          success: false,
          error: 'Session revoked',
        });
        return;
      }

      // Best-effort session activity tracking
      void AuthService.touchSession(String(payloadAny.sessionId));
    }

    req.user = payloadAny;

    // Tenant read-only (quarantine) enforcement for write requests.
    // - Applies only to non-superadmin tokens
    // - Best-effort: if DB/schema isn't ready, fail-open to avoid lockouts
    const tenantIdToCheck = String(req.tenantId || payloadAny.tenantId || '');
    const method = String((req as any)?.method || '').toUpperCase();
    const isWrite = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
    if (isWrite && tenantIdToCheck && String(payloadAny.role) !== UserRole.SuperAdmin) {
      try {
        const t = await db.query.tenants.findFirst({
          where: (fields: any, ops: any) => ops.eq(fields.id, tenantIdToCheck),
        });
        if (t && Boolean((t as any).is_read_only)) {
          res.status(423).json({
            success: false,
            error: 'Tenant is in read-only mode',
            code: 'TENANT_READ_ONLY',
          });
          return;
        }
      } catch {
        // ignore (fail-open)
      }
    }

    req.tenantId = req.tenantId || payloadAny.tenantId;
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
