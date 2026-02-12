import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { AuthError, AuthService } from '../services/auth.service.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../auth/jwt.js';
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
      const superadminByUsername = await AuthService.findUserByUsername(tenantId, 'superadmin');
      const superadminByEmail = await AuthService.findUserByEmail(tenantId, 'superadmin@cmms.com');
      const tecnicoByUsername = await AuthService.findUserByUsername(tenantId, 'tecnico');
      const tecnicoByEmail = await AuthService.findUserByEmail(tenantId, 'tecnico@cmms.com');
      // Backward-compat (demo antigo)
      const techByUsername = await AuthService.findUserByUsername(tenantId, 'tech');
      const techByEmail = await AuthService.findUserByEmail(tenantId, 'tech@cmms.com');

      res.json({
        success: true,
        data: {
          tenantId,
          tenantSlug,
          usersInTenant,
          demoUsers: {
            superadmin: Boolean(superadminByUsername || superadminByEmail),
            admin: Boolean(adminByUsername || adminByEmail),
            tecnico: Boolean(tecnicoByUsername || tecnicoByEmail),
            // Backward-compat
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
      let user: any;
      try {
        user = await withTimeout(
          AuthService.validateCredentials(tenantId, safeUsername, password),
          Number(process.env.AUTH_LOGIN_TIMEOUT_MS || 12_000),
          'AuthService.validateCredentials',
        );
      } catch (err: any) {
        if (err instanceof AuthError) {
          if (err.code === 'ACCOUNT_LOCKED') {
            res.status(429).json({ success: false, error: 'Conta temporariamente bloqueada. Tente novamente mais tarde.' });
            return;
          }
          if (err.code === 'PASSWORD_EXPIRED') {
            res.status(403).json({ success: false, error: 'Password expirada. Contacte o administrador para reset.' });
            return;
          }
        }
        throw err;
      }

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
        sessionVersion: Number((user as any)?.session_version ?? 0),
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

      const refreshPayload: any = verifyRefreshToken(String(refreshToken));
      if (!refreshPayload) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token',
        });
        return;
      }

      // Backward-compat for older tokens
      if (!refreshPayload.userId && refreshPayload.id) refreshPayload.userId = refreshPayload.id;
      if (!refreshPayload.tenantId && refreshPayload.tenant_id) refreshPayload.tenantId = refreshPayload.tenant_id;

      if (!refreshPayload.userId) {
        res.status(401).json({
          success: false,
          error: 'Invalid refresh token payload',
        });
        return;
      }

      const user = await AuthService.findUserById(String(refreshPayload.userId));

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      if (!user.is_active) {
        res.status(401).json({
          success: false,
          error: 'User inactive',
        });
        return;
      }

      const tokenSessionVersion = Number(refreshPayload.sessionVersion ?? 0);
      const currentSessionVersion = Number((user as any).session_version ?? 0);
      if (tokenSessionVersion !== currentSessionVersion) {
        res.status(401).json({
          success: false,
          error: 'Session revoked',
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
        sessionVersion: Number((user as any)?.session_version ?? 0),
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

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const tenantId = req.tenantId || req.user.tenantId || DEFAULT_TENANT_ID;
      await AuthService.bumpUserSessionVersion({ tenantId, userId: req.user.userId });

      res.json({ success: true, message: 'Sessions revoked' });
    } catch (error) {
      logger.error('Logout/revoke sessions error:', error);
      res.status(500).json({ success: false, error: 'Failed to revoke sessions' });
    }
  }
}
