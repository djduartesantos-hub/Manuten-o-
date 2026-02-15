// @ts-nocheck
import { Response } from 'express';
import { SparePartService } from '../services/sparepart.service.js';
import { NotificationService } from '../services/notification.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import {
  createSparePartSchema,
  updateSparePartSchema,
  createStockMovementSchema,
} from '../schemas/sparepart.validation.js';
import { SparePartForecastService } from '../services/sparepartforecast.service.js';
import { AuditService } from '../services/audit.service.js';
import { buildAuditDiffFromPatch, getClientIp } from '../utils/audit.js';
import { AuditService } from '../services/audit.service.js';
import { buildAuditDiffFromPatch, getClientIp } from '../utils/audit.js';

const sparePartService = new SparePartService();
const sparePartForecastService = new SparePartForecastService();

/**
 * Get all spare parts for tenant
 * GET /spareparts
 */
export async function getSpareParts(req: AuthenticatedRequest, res: Response) {
  try {
    const { supplier_id, search } = req.query;

    const parts = await sparePartService.getSpareParts(req.tenantId!, {
      supplier_id: supplier_id as string,
      search: search as string,
    });

    res.json({
      success: true,
      data: parts,
      total: parts.length,
    });
  } catch (error) {
    console.error('Error fetching spare parts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch spare parts',
    });
  }
}

/**
 * Get spare parts forecast for a plant
 * GET /spareparts/forecast?days=30
 */
export async function getSparePartsForecast(req: AuthenticatedRequest, res: Response) {
  try {
    const { plantId } = req.params;
    const daysRaw = req.query?.days;
    const days = daysRaw ? Number(daysRaw) : 30;

    if (!plantId) {
      res.status(400).json({ success: false, error: 'Plant ID is required' });
      return;
    }

    const result = await sparePartForecastService.getForecast(req.tenantId!, plantId, days);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching spare parts forecast:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch spare parts forecast',
    });
  }
}

/**
 * Get a single spare part
 * GET /spareparts/:spare_part_id
 */
export async function getSparePart(req: AuthenticatedRequest, res: Response) {
  try {
    const { spare_part_id } = req.params;

    if (!spare_part_id) {
      res.status(400).json({
        success: false,
        error: 'Spare part ID is required',
      });
      return;
    }

    const part = await sparePartService.getSparePartById(req.tenantId!, spare_part_id);

    res.json({
      success: true,
      data: part,
    });
  } catch (error) {
    console.error('Error fetching spare part:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch spare part',
    });
  }
}

/**
 * Create a new spare part
 * POST /spareparts
 */
export async function createSparePart(req: AuthenticatedRequest, res: Response) {
  try {
    const validation = createSparePartSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validation.error.errors,
      });
      return;
    }

    const part = await sparePartService.createSparePart(req.tenantId!, validation.data);

    if (req.user?.userId) {
      try {
        await AuditService.createLog({
          tenant_id: String(req.tenantId),
          user_id: String(req.user.userId),
          action: 'create',
          entity_type: 'spare_part',
          entity_id: String(part.id),
          old_values: null,
          new_values: {
            id: part.id,
            code: part.code,
            name: part.name,
            supplier_id: part.supplier_id,
          },
          ip_address: getClientIp(req),
        });
      } catch {
        // ignore
      }
    }

    res.status(201).json({
      success: true,
      data: part,
      message: 'Spare part created successfully',
    });
  } catch (error) {
    console.error('Error creating spare part:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create spare part',
    });
  }
}

/**
 * Update a spare part
 * PATCH /spareparts/:spare_part_id
 */
export async function updateSparePart(req: AuthenticatedRequest, res: Response) {
  try {
    const { spare_part_id } = req.params;

    if (!spare_part_id) {
      res.status(400).json({
        success: false,
        error: 'Spare part ID is required',
      });
      return;
    }

    const validation = updateSparePartSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validation.error.errors,
      });
      return;
    }

    const before = await sparePartService.getSparePartById(req.tenantId!, spare_part_id);
    const part = await sparePartService.updateSparePart(
      req.tenantId!,
      spare_part_id,
      validation.data
    );

    if (req.user?.userId && before) {
      const diff = buildAuditDiffFromPatch({
        before: before as any,
        after: part as any,
        patch: validation.data as any,
      });

      if (Object.keys(diff.oldValues).length > 0) {
        try {
          await AuditService.createLog({
            tenant_id: String(req.tenantId),
            user_id: String(req.user.userId),
            action: 'update',
            entity_type: 'spare_part',
            entity_id: String(part.id),
            old_values: diff.oldValues,
            new_values: diff.newValues,
            ip_address: getClientIp(req),
          });
        } catch {
          // ignore
        }
      }
    }

    res.json({
      success: true,
      data: part,
      message: 'Spare part updated successfully',
    });
  } catch (error) {
    console.error('Error updating spare part:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update spare part',
    });
  }
}

/**
 * Delete a spare part
 * DELETE /spareparts/:spare_part_id
 */
export async function deleteSparePart(req: AuthenticatedRequest, res: Response) {
  try {
    const { spare_part_id } = req.params;

    if (!spare_part_id) {
      res.status(400).json({
        success: false,
        error: 'Spare part ID is required',
      });
      return;
    }

    const before = await sparePartService.getSparePartById(req.tenantId!, spare_part_id);
    await sparePartService.deleteSparePart(req.tenantId!, spare_part_id);

    if (req.user?.userId && before) {
      try {
        await AuditService.createLog({
          tenant_id: String(req.tenantId),
          user_id: String(req.user.userId),
          action: 'delete',
          entity_type: 'spare_part',
          entity_id: String(spare_part_id),
          old_values: {
            id: (before as any).id,
            code: (before as any).code,
            name: (before as any).name,
            supplier_id: (before as any).supplier_id,
          },
          new_values: null,
          ip_address: getClientIp(req),
        });
      } catch {
        // ignore
      }
    }

    res.json({
      success: true,
      message: 'Spare part deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting spare part:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete spare part',
    });
  }
}

/**
 * Get stock quantity for a spare part at a plant
 * GET /spareparts/:spare_part_id/stock/:plant_id
 */
export async function getStockQuantity(req: AuthenticatedRequest, res: Response) {
  try {
    const { spare_part_id, plant_id } = req.params;

    if (!spare_part_id || !plant_id) {
      res.status(400).json({
        success: false,
        error: 'Spare part ID and plant ID are required',
      });
      return;
    }

    const quantity = await sparePartService.getStockQuantity(
      req.tenantId!,
      spare_part_id,
      plant_id
    );

    res.json({
      success: true,
      data: {
        spare_part_id,
        plant_id,
        quantity,
      },
    });
  } catch (error) {
    console.error('Error fetching stock quantity:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stock quantity',
    });
  }
}

/**
 * Create a stock movement
 * POST /stock-movements
 */
export async function createStockMovement(req: AuthenticatedRequest, res: Response) {
  try {
    const validation = createStockMovementSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validation.error.errors,
      });
      return;
    }

    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User ID not found in request',
      });
      return;
    }

    const movement = await sparePartService.createStockMovement(
      req.tenantId!,
      userId,
      validation.data
    );

    NotificationService.checkLowStockForPart(
      req.tenantId!,
      validation.data.plant_id,
      validation.data.spare_part_id,
    ).catch((error) => {
      console.warn('Low stock check failed:', error);
    });

    res.status(201).json({
      success: true,
      data: movement,
      message: 'Stock movement recorded successfully',
    });
  } catch (error) {
    console.error('Error creating stock movement:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record stock movement',
    });
  }
}

/**
 * Get stock movements for a spare part
 * GET /spareparts/:spare_part_id/movements
 */
export async function getStockMovementsByPart(req: AuthenticatedRequest, res: Response) {
  try {
    const { spare_part_id } = req.params;
    const { plant_id } = req.query;

    if (!spare_part_id) {
      res.status(400).json({
        success: false,
        error: 'Spare part ID is required',
      });
      return;
    }

    const movements = await sparePartService.getStockMovementsByPart(
      req.tenantId!,
      spare_part_id,
      plant_id as string | undefined
    );

    res.json({
      success: true,
      data: movements,
      total: movements.length,
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stock movements',
    });
  }
}

/**
 * Get stock movements for a plant
 * GET /stock-movements/plant/:plant_id
 */
export async function getStockMovementsByPlant(req: AuthenticatedRequest, res: Response) {
  try {
    const { plant_id } = req.params;

    if (!plant_id) {
      res.status(400).json({
        success: false,
        error: 'Plant ID is required',
      });
      return;
    }

    const movements = await sparePartService.getStockMovementsByPlant(req.tenantId!, plant_id);

    res.json({
      success: true,
      data: movements,
      total: movements.length,
    });
  } catch (error) {
    console.error('Error fetching plant stock movements:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stock movements',
    });
  }
}

/**
 * Get stock summary for a spare part
 * GET /spareparts/:spare_part_id/stock-summary
 */
export async function getStockSummary(req: AuthenticatedRequest, res: Response) {
  try {
    const { spare_part_id } = req.params;

    if (!spare_part_id) {
      res.status(400).json({
        success: false,
        error: 'Spare part ID is required',
      });
      return;
    }

    const summary = await sparePartService.getStockSummary(req.tenantId!, spare_part_id);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching stock summary:', error);
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stock summary',
    });
  }
}
