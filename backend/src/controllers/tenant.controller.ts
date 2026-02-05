import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { TenantService } from '../services/tenant.service.js';

export async function getUserPlants(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !req.tenantId) {
      console.warn('getUserPlants: Missing user or tenantId', {
        hasUser: !!req.user,
        hasTenantId: !!req.tenantId,
      });
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    console.log(`getUserPlants: Fetching plants for user ${req.user.userId} in tenant ${req.tenantId}`);

    const plants = await TenantService.getUserPlants(req.user.userId, req.tenantId);

    console.log(`getUserPlants: Found ${plants.length} plants for user ${req.user.userId}`);

    if (!plants || plants.length === 0) {
      console.warn(`getUserPlants: No plants found for user ${req.user.userId} in tenant ${req.tenantId}`);
    }

    res.json({
      success: true,
      data: plants,
      total: plants.length,
    });
  } catch (error) {
    console.error('getUserPlants error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch plants',
    });
  }
}