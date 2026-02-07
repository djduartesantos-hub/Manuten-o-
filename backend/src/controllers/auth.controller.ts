import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { AuthService } from '../services/auth.service.js';
import { generateToken, generateRefreshToken } from '../auth/jwt.js';
import { logger } from '../config/logger.js';
import { DEFAULT_TENANT_ID } from '../config/constants.js';

export class AuthController {
  static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const user = await AuthService.validateCredentials(tenantId, username, password);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
        return;
      }

      const plantIds = await AuthService.getUserPlantIds(user.id, user.tenant_id, user.role);

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
