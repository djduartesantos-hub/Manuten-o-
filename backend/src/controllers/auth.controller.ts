import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { AuthService } from '../services/auth.service.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../auth/jwt.js';
import { logger } from '../config/logger.js';
import { DEFAULT_TENANT_ID } from '../config/constants.js';
import { db } from '../config/database.js';
import { users } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { TimeoutError, withTimeout } from '../utils/timeout.js';
import crypto from 'node:crypto';

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

      const ipAddress =
        (String(req.headers['x-forwarded-for'] || '').split(',')[0] || '').trim() ||
        (req.ip ? String(req.ip) : null);
      const userAgent = req.headers['user-agent'] ? String(req.headers['user-agent']) : null;

      const user = await withTimeout(
        AuthService.validateCredentials(tenantId, safeUsername, password),
        Number(process.env.AUTH_LOGIN_TIMEOUT_MS || 12_000),
        'AuthService.validateCredentials',
      );

      if (!user) {
        await AuthService.recordLoginEvent({
          tenantId,
          username: safeUsername,
          success: false,
          userId: null,
          ipAddress,
          userAgent,
          error: 'invalid_credentials',
        });
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

      const sessionId = crypto.randomUUID();
      payload.sessionId = sessionId;

      const token = generateToken(payload);
      const refreshToken = generateRefreshToken(payload);

      await AuthService.createSession({
        sessionId,
        tenantId: user.tenant_id,
        userId: user.id,
        refreshToken,
        ipAddress,
        userAgent,
      });

      await AuthService.recordLoginEvent({
        tenantId: user.tenant_id,
        username: safeUsername,
        success: true,
        userId: user.id,
        ipAddress,
        userAgent,
      });

      // Best-effort last_login update (non-blocking for auth response)
      try {
        await db.update(users).set({ last_login: new Date() }).where(eq(users.id, user.id));
      } catch (error) {
        logger.warn('Failed to update last_login', { userId: user.id, error });
      }

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

      const refreshPayload = verifyRefreshToken(String(refreshToken));
      if (!refreshPayload?.userId || !refreshPayload?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token',
        });
        return;
      }

      const sessionId = (refreshPayload as any).sessionId as string | undefined;
      if (!sessionId) {
        res.status(401).json({
          success: false,
          error: 'Invalid refresh token payload',
        });
        return;
      }

      const sessionValid = await AuthService.isRefreshTokenValidForSession(sessionId, String(refreshToken));
      if (!sessionValid) {
        res.status(401).json({
          success: false,
          error: 'Session revoked or refresh token rotated',
        });
        return;
      }

      const user = await AuthService.findUserById(refreshPayload.userId);

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
        sessionId,
      };

      const newToken = generateToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      await AuthService.rotateSessionRefreshToken(sessionId, newRefreshToken);

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
      const sessionId = (req.user as any)?.sessionId as string | undefined;
      if (!req.user?.userId || !sessionId) {
        res.json({ success: true, data: { message: 'Logged out' } });
        return;
      }

      await AuthService.revokeSession(sessionId, req.user.userId);
      res.json({ success: true, data: { message: 'Logged out' } });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({ success: false, error: 'Logout failed' });
    }
  }

  static async logoutAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const tenantId = req.tenantId || req.user.tenantId || DEFAULT_TENANT_ID;
      const count = await AuthService.revokeAllSessionsForUser(tenantId, req.user.userId, req.user.userId);
      res.json({ success: true, data: { revoked: count } });
    } catch (error) {
      logger.error('Logout-all error:', error);
      res.status(500).json({ success: false, error: 'Logout-all failed' });
    }
  }
}
