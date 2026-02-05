import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { TenantService } from '../services/tenant.service.js';

export async function getUserPlants(req: AuthenticatedRequest, res: Response) {
  try {
    console.log('[getUserPlants] Request received');
    console.log(`  req.user: ${JSON.stringify(req.user)}`);
    
    if (!req.user) {
      console.warn('getUserPlants: Missing user authentication');
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    // Get tenantId from user's JWT token
    const tenantId = req.user.tenantId;
    
    if (!tenantId) {
      console.error('getUserPlants: User has no tenantId in JWT', {
        userId: req.user.userId,
        userRole: req.user.role,
      });
      res.status(400).json({
        success: false,
        error: 'User has no tenant association',
      });
      return;
    }

    console.log(`[getUserPlants] Fetching plants for user ${req.user.userId} in tenant ${tenantId}`);

    const plants = await TenantService.getUserPlants(req.user.userId, tenantId);

    console.log(`[getUserPlants] API returning ${plants.length} plants`);
    
    if (!plants || plants.length === 0) {
      console.warn(`[getUserPlants] Warning: No plants found for user ${req.user.userId} in tenant ${tenantId}`);
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