import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { TenantService } from '../services/tenant.service.js';

export async function getUserPlants(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !req.tenantId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const plants = await TenantService.getUserPlants(req.user.userId, req.tenantId);

    res.json({
      success: true,
      data: plants,
      total: plants.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch plants',
    });
  }
}