import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { AuthService } from '../services/auth.service';
import { generateToken, generateRefreshToken } from '../auth/jwt';
import { logger } from '../config/logger';

export class AuthController {
  static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password, tenant_id, tenant_slug } = req.body;

      if (!email || !password || (!tenant_id && !tenant_slug)) {
        res.status(400).json({
          success: false,
          error: 'Email, password and tenant_id or tenant_slug are required',
        });
        return;
      }

      let resolvedTenantId = tenant_id;

      if (!resolvedTenantId && tenant_slug) {
        const tenant = await AuthService.findTenantBySlug(tenant_slug);
        if (!tenant) {
          res.status(400).json({
            success: false,
            error: 'Tenant not found for provided tenant_slug',
          });
          return;
        }
        resolvedTenantId = tenant.id;
      }

      const user = await AuthService.validateCredentials(
        resolvedTenantId as string,
        email,
        password,
      );

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
        return;
      }

      const payload: any = {
        userId: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        role: user.role,
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
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            tenantId: user.tenant_id,
          },
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
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

      const payload: any = {
        userId: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        role: user.role,
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
