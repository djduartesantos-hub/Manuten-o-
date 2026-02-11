import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { AuthService } from '../services/auth.service.js';
import { generateToken, generateRefreshToken } from '../auth/jwt.js';
import { logger } from '../config/logger.js';
import { DEFAULT_TENANT_ID } from '../config/constants.js';
import { db } from '../config/database.js';
import { users } from '../db/schema.js';
import { sql } from 'drizzle-orm';
import { TimeoutError, withTimeout } from '../utils/timeout.js';

export class AuthController {
  static async status(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId || DEFAULT_TENANT_ID;
      const tenantSlug = req.tenantSlug;

      const userCountResult = await db.execute(
        sql`SELECT COUNT(*)::int AS count FROM users WHERE tenant_id = ${tenantId};`,
      );
      const usersInTenant = Number((userCountResult.rows?.[0] as any)?.count ?? 0);

      const adminByUsername = await AuthService.findUserByUsername(tenantId, 'admin');
      const adminByEmail = await AuthService.findUserByEmail(tenantId, 'admin@cmms.com');
      const techByUsername = await AuthService.findUserByUsername(tenantId, 'tech');
      const techByEmail = await AuthService.findUserByEmail(tenantId, 'tech@cmms.com');

      res.json({
        success: true,
        data: {
          tenantId,
          tenantSlug,
          usersInTenant,
          demoUsers: {
            admin: Boolean(adminByUsername || adminByEmail),
            tech: Boolean(techByUsername || techByEmail),
          },
        },
      });
    } catch (error) {
      logger.error('Auth status error:', error);
      res.status(500).json({
        success: false,
        error: 'Status check failed',
      });
    }
  }

  static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startedAt = Date.now();
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: 'Username and password are required',
        });
        return;
      }

      const tenantId = req.tenantId || DEFAULT_TENANT_ID;
      const safeUsername = String(username).trim().toLowerCase();
      const user = await withTimeout(
        AuthService.validateCredentials(tenantId, safeUsername, password),
        Number(process.env.AUTH_LOGIN_TIMEOUT_MS || 12_000),
        'AuthService.validateCredentials',
      );

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
        return;
      }

      const plantIds = await withTimeout(
        AuthService.getUserPlantIds(user.id, user.tenant_id, user.role),
        Number(process.env.AUTH_LOGIN_TIMEOUT_MS || 12_000),
        'AuthService.getUserPlantIds',
      );

      const payload: any = {
        userId: user.id,
        tenantId: user.tenant_id,
        username: user.username,
        email: user.email,
        role: user.role,
        plantIds: plantIds || [],
      };

      const token = generateToken(payload);
      const refreshToken = generateRefreshToken(payload);

      res.json({
        success: true,
        data: {
          token,
          refreshToken,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            tenantId: user.tenant_id,
          },
        },
      });
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      logger.error('Login error', {
        durationMs,
        tenantId: req.tenantId,
        tenantSlug: req.tenantSlug,
        username: req.body?.username,
        error,
      });

      const message = error instanceof Error ? error.message : 'Login failed';

      // Convert common transient issues into a clearer response for production.
      const isTimeout = error instanceof TimeoutError;
      const isTransientDb =
        error instanceof Error &&
        (message.toLowerCase().includes('timeout') ||
          message.toLowerCase().includes('connection terminated') ||
          message.toLowerCase().includes('too many clients') ||
          message.toLowerCase().includes('econnreset') ||
          message.toLowerCase().includes('etimedout'));

      if (isTimeout || isTransientDb) {
        res.status(503).json({
          success: false,
          error: 'Service temporarily unavailable',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Login failed',
      });
    }
  }

  static async refresh(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
        });
        return;
      }

      const user = await AuthService.findUserById(req.user?.userId || '');

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Load plant IDs for the user
      const plantIds = await AuthService.getUserPlantIds(
        user.id,
        user.tenant_id,
        user.role
      );

      const payload: any = {
        userId: user.id,
        tenantId: user.tenant_id,
        username: user.username,
        email: user.email,
        role: user.role,
        plantIds: plantIds || [],
      };

      const newToken = generateToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      res.json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        error: 'Token refresh failed',
      });
    }
  }
}
